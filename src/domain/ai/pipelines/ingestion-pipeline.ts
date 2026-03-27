import { createAdminClient } from '@/lib/supabase/admin';
import { generateEmbeddings, cleanTechnicalText } from '@/domain/ai/utils/embeddings';
import { extractTextStream } from '@/domain/ai/utils/pdf-stream-extractor';
import { semanticChunk } from '@/domain/ai/utils/semantic-chunker';
import { logInfo, logError } from '@/lib/logger';
import { ExtractorService } from '@/lib/ai/pipeline/extractor';

/**
 * Executes the full one-time PDF ingestion pipeline asynchronously.
 * Designed to be called by a background queue system to prevent HTTP timeouts.
 */
export async function processManualIngestionPipeline(
    machineId: string,
    storageUrl: string,
    organizationId: string
) {
    const supabase = createAdminClient();
    try {
        logInfo('pipeline.started', { organizationId, jobId: `job_${machineId}`, machineId, storageUrl });

        // Mark as processing
        await supabase.from('machines')
            .update({ ingestion_status: 'PROCESSING' })
            .eq('id', machineId);

        // Ensure any existing chunks are purged (Idempotency)
        await supabase.from('manual_chunks')
            .delete()
            .eq('machine_id', machineId);

        // Create ingestion run and KB once, upfront
        const { data: runData } = await supabase.from('machine_ingestion_runs').insert({
            machine_id: machineId,
            organization_id: organizationId,
            status: 'running',
            current_phase: 'extract',
            total_documents: 1,
            processed_documents: 0,
            successful_documents: 0,
            failed_documents: 0
        }).select('id').single();

        // Get or create KB (idempotent)
        let kbId: string;
        const { data: existingKb } = await supabase.from('machine_kb').select('id').eq('machine_id', machineId).eq('version', 1).maybeSingle();

        if (existingKb?.id) {
            kbId = existingKb.id;
            console.log(`[PipelineDebug] KB retrieved: kbId=${kbId}`);
        } else {
            const { data: newKbData, error: kbError } = await supabase.from('machine_kb').insert({
                run_id: runData!.id,
                machine_id: machineId,
                organization_id: organizationId,
                version: 1
            }).select('id').single();
            kbId = newKbData?.id;
            console.log(`[PipelineDebug] KB created: kbId=${kbId}, error=${kbError?.message || 'none'}`);
        }

        if (!kbId) throw new Error('Failed to get or create machine_kb');

        let chunkBatch: any[] = [];
        let chunkCount = 0;
        let sourceChunk: any = null;

        // 1. Stream the PDF page by page
        for await (const page of extractTextStream(storageUrl)) {
            // 2. Technical Cleaning (Phase 1 AI Reliability)
            // We use Gemini to identify checklists and tables to ensure they stay contiguous
            const cleanedPage = await cleanTechnicalText(page.text);

            // 3. Semantic Chunking (Page-Aware)
            const chunks = semanticChunk(cleanedPage, 800, 100, page.pageNumber);

            for (const chunk of chunks) {
                // 4. Generate Embeddings via Gemini (768d)
                const vector = await generateEmbeddings(chunk.text);

                if (!sourceChunk) sourceChunk = chunk;

                chunkBatch.push({
                    machine_id: machineId,
                    organization_id: organizationId,
                    chunk_text: chunk.text,
                    embedding: vector,
                    page_number: chunk.page_number || null,
                    section_title: chunk.section_title || null
                });

                // 5. Extract entities from this chunk (parts, procedures, faults)
                for (const entityType of ['part', 'procedure', 'fault']) {
                    const extractResult = await ExtractorService.extractFromChunk(machineId, {
                        type: entityType,
                        content: chunk.text,
                        title: chunk.section_title || 'Section',
                        page_number: chunk.page_number || null
                    }, kbId, organizationId, runData?.id);
                    if (!extractResult.success) {
                        console.warn(`⚠️  Entity extraction (${entityType}) failed: ${extractResult.error}`);
                    }
                }

                // 6. Batch insert into pgvector
                if (chunkBatch.length >= 25) { // Smaller batches for reliability
                    const { error } = await supabase.from('manual_chunks').insert(chunkBatch);
                    if (error) throw error;
                    chunkCount += chunkBatch.length;
                    chunkBatch = [];
                    // Small breathing room for rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        // Insert remainder
        if (chunkBatch.length > 0) {
            console.log(`💾 Finalizing insert of ${chunkBatch.length} chunks...`);
            const { error } = await supabase.from('manual_chunks').insert(chunkBatch);
            if (error) {
                console.error('❌ Insert Error:', error);
                throw error;
            }
            console.log(`✅ Insert Success for ${chunkBatch.length} chunks.`);
            chunkCount += chunkBatch.length;
        }

        // 6. Create machine_document entry to link this ingestion
        console.log(`📄 Creating machine_document entry...`);
        const { data: machineDocData, error: docError } = await supabase.from('machine_documents').insert({
            machine_id: machineId,
            organization_id: organizationId,
            storage_path: storageUrl,
            filename: storageUrl,
            document_type: 'other',
            language: 'en',
            processing_status: 'completed',
            source_hash: null
        }).select('id').maybeSingle();

        if (docError) {
            console.error('❌ Document link error:', docError);
        } else {
            console.log(`✅ Machine document created.`);
        }

        // 7. Retrieve inserted parts (single read, deterministic)
        const { data: insertedParts, error: partsError } = await supabase.from('parts').select('id, name, canonical_part_number').eq('machine_id', machineId);
        console.log(`📊 Parts retrieved: ${insertedParts?.length || 0} parts, error: ${partsError?.message || 'none'}, sourceChunk: ${sourceChunk ? JSON.stringify({page: sourceChunk.page_number, text_len: sourceChunk.chunk_text?.length}) : 'null'}`);

        // 8. Create KB infrastructure and evidence for parts
        console.log(`📚 Creating KB evidence...`);
        await createKBEvidenceForParts(supabase, machineId, organizationId, machineDocData?.id, insertedParts || [], sourceChunk);

        // 8. Finalize status
        await supabase.from('machines')
            .update({ ingestion_status: 'COMPLETED' })
            .eq('id', machineId);

        logInfo('pipeline.success', { organizationId, jobId: `job_${machineId}`, machineId, chunkCount });

    } catch (e: any) {
        logError('pipeline.error', e, { organizationId, jobId: `job_${machineId}`, machineId });
        await supabase.from('machines')
            .update({ ingestion_status: 'FAILED' })
            .eq('id', machineId);
        throw e;
    }
}

async function createKBEvidenceForParts(supabase: any, machineId: string, organizationId: string, docId: string | undefined, insertedParts: any[], sourceChunk: any) {
    try {
        // 1. Create or get ingestion run
        const { data: runData } = await supabase.from('machine_ingestion_runs').insert({
            machine_id: machineId,
            organization_id: organizationId,
            status: 'completed',
            current_phase: 'extract',
            total_documents: 1,
            processed_documents: 1,
            successful_documents: 1,
            failed_documents: 0
        }).select('id').single();

        if (!runData?.id) return;

        // 2. Create machine_kb
        const { data: kbData } = await supabase.from('machine_kb').insert({
            run_id: runData.id,
            machine_id: machineId,
            organization_id: organizationId,
            version: 1
        }).select('id').single();

        if (!kbData?.id) return;

        // 3. Use passed-in parts instead of re-reading DB
        const parts = insertedParts || [];
        if (!parts || parts.length === 0) return;

        // 4. Use sourceChunk passed in memory
        const sourcePage = String(sourceChunk?.page_number ?? 1);
        const sourceSnippet = sourceChunk?.chunk_text?.substring(0, 200) || 'Evidence from manual';

        // 5. For each part, create entity and evidence
        for (const part of parts) {
            // Create entity
            const { data: entityData } = await supabase.from('machine_kb_entities').insert({
                kb_id: kbData.id,
                run_id: runData.id,
                machine_id: machineId,
                organization_id: organizationId,
                entity_type: 'part',
                canonical_name: part.name,
                original_label: part.canonical_part_number || part.name,
                source_document_id: docId,
                source_page: sourcePage,
                evidence_snippet: sourceSnippet,
                language: 'en',
                confidence: 'high'
            }).select('id').single();

            if (!entityData?.id) continue;

            // Create evidence
            await supabase.from('machine_kb_evidence').insert({
                entity_id: entityData.id,
                kb_id: kbData.id,
                machine_id: machineId,
                organization_id: organizationId,
                source_document_id: docId,
                source_file_name: 'ingestion',
                source_page: sourcePage,
                evidence_snippet: sourceSnippet,
                language: 'en',
                confidence: 'high'
            });
        }

        console.log(`✅ KB evidence created for ${parts.length} parts.`);
    } catch (err: any) {
        console.warn(`⚠️  KB evidence creation failed: ${err.message}`);
    }
}
