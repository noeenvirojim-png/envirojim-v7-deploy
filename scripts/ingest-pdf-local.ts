import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { createAdminClient } from '../src/lib/supabase/admin';
import { processManualIngestionPipeline } from '../src/domain/ai/pipelines/ingestion-pipeline';

/**
 * Synchronous local PDF ingestion
 * Calls the real pipeline service with a local PDF file
 * Returns proof of DB writes
 */

const MACHINE_ID = 'd6da048e-11a1-40ae-a61f-18f81614137e'; // VB750
const ORG_ID = '550e8400-e29b-41d4-a716-446655440000';
// Accept PDF filename from command-line argument or use default
const PDF_FILENAME = process.argv[2] || '08 VB750DK-m2021 EU V Instructions d\u2019entretien V401.pdf';

async function ingestAndProve() {
  console.log('=== REAL SYNC PDF INGESTION ===\n');
  console.log(`PDF: ${PDF_FILENAME}`);
  console.log(`Machine: ${MACHINE_ID}`);
  console.log(`Org: ${ORG_ID}\n`);

  const supabase = createAdminClient();
  const startTime = Date.now();

  try {
    // Call the real pipeline service synchronously
    console.log('Starting ingestion pipeline...');
    await processManualIngestionPipeline(MACHINE_ID, PDF_FILENAME, ORG_ID);

    const duration = Date.now() - startTime;
    console.log(`✅ Pipeline completed in ${(duration / 1000).toFixed(1)}s\n`);

    // Read results from DB
    console.log('=== READING DB RESULTS ===\n');

    // 1. Check manual_chunks
    console.log('Checking manual_chunks...');
    const { data: chunks, error: chunksError } = await supabase
      .from('manual_chunks')
      .select('id, page_number, section_title')
      .eq('machine_id', MACHINE_ID)
      .limit(10);

    if (chunksError) throw chunksError;
    const chunkCount = chunks?.length || 0;
    console.log(`✓ Chunks created: ${chunkCount}`);

    // 2. Check machines status
    console.log('\nChecking machines status...');
    const { data: machineData } = await supabase
      .from('machines')
      .select('ingestion_status, updated_at')
      .eq('id', MACHINE_ID)
      .single();

    console.log(`✓ Machine status: ${machineData?.ingestion_status}`);

    // 3. Check machine_documents
    console.log('\nChecking machine_documents...');
    const { data: documents } = await supabase
      .from('machine_documents')
      .select('id')
      .eq('machine_id', MACHINE_ID);
    const docCount = documents?.length || 0;
    console.log(`✓ Documents created: ${docCount}`);

    // 4. Check machine_kb_entities
    console.log('\nChecking machine_kb_entities...');
    const { data: entities } = await supabase
      .from('machine_kb_entities')
      .select('id, canonical_name, source_page')
      .eq('machine_id', MACHINE_ID);
    const entityCount = entities?.length || 0;
    console.log(`✓ Entities created: ${entityCount}`);

    // 5. Check machine_kb_evidence
    console.log('\nChecking machine_kb_evidence...');
    const { data: evidence } = await supabase
      .from('machine_kb_evidence')
      .select('id, source_page, evidence_snippet, entity_id')
      .eq('machine_id', MACHINE_ID)
      .order('created_at', { ascending: false })
      .limit(3);
    const evidenceCount = evidence?.length || 0;
    const nonEmptySourcePageCount = evidence?.filter(e => e.source_page && e.source_page !== '').length || 0;
    console.log(`✓ Evidence created: ${evidenceCount}`);
    console.log(`✓ Evidence with non-empty source_page: ${nonEmptySourcePageCount}`);

    // 6. Get full evidence count
    const { count: totalEvidenceCount } = await supabase
      .from('machine_kb_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', MACHINE_ID);
    const totalEvidenceCreated = totalEvidenceCount || 0;
    const { count: totalNonEmptyPages } = await supabase
      .from('machine_kb_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', MACHINE_ID)
      .neq('source_page', '');
    const nonEmptyPagesCount = totalNonEmptyPages || 0;

    // 7. Check procedures from procedures table
    console.log('\nChecking procedures...');
    const { count: proceduresCount } = await supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', MACHINE_ID);
    const proceduresTotal = proceduresCount || 0;

    // 8. Check faults from KB entities
    console.log('\nChecking faults from KB entities...');
    const { count: faultsCount } = await supabase
      .from('machine_kb_entities')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', MACHINE_ID)
      .eq('entity_type', 'fault_case');
    const faultsTotal = faultsCount || 0;
    console.log(`✓ Procedures created: ${proceduresTotal}`);
    console.log(`✓ Faults in KB: ${faultsTotal}`);

    // Final report
    console.log('\n=== FINAL PROOF ===\n');
    const proof = {
      pdf_filename: PDF_FILENAME,
      machine_id: MACHINE_ID,
      pipeline_execution_time_seconds: (duration / 1000).toFixed(1),
      tables_touched: ['manual_chunks', 'machines', 'machine_documents', 'machine_kb_entities', 'machine_kb_evidence'],
      document_created_or_linked: docCount > 0,
      machine_document_created_or_updated: docCount > 0,
      entities_created: entityCount > 0,
      evidence_created: totalEvidenceCreated > 0,
      chunks_created: chunkCount,
      entity_count: entityCount,
      evidence_count: totalEvidenceCreated,
      non_empty_source_page_count: nonEmptyPagesCount,
      procedures_created: proceduresTotal > 0,
      faults_created: faultsTotal > 0,
      procedures_count: proceduresTotal,
      faults_count: faultsTotal,
      first_useful_items: evidence?.map(e => ({
        type: 'evidence',
        label: e.source_page || '?',
        page: e.source_page || '?',
        snippet: e.evidence_snippet?.substring(0, 40) || '(empty)'
      })) || []
    };

    console.log(JSON.stringify(proof, null, 2));

    process.exit(chunkCount > 0 ? 0 : 1);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

ingestAndProve();
