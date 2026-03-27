import { createClient } from '@/lib/supabase/server';
import { extractErrorCodes } from '@/domain/ai/utils/nlp';
import { generateEmbeddings } from '@/domain/ai/utils/embeddings';
import { generateRootCauseAnalysis } from '@/domain/ai/agents/root-cause-agent';
import { checkSemanticCache, setSemanticCache } from '@/domain/ai/utils/semantic-cache';

/**
 * Executes a < 2s retrieval pipeline combining PgVector HNSW search, 
 * Exact SQL matching for Error Codes, and Historical Learning matching.
 */
export async function processDiagnosticRetrieval(query: string, machineId: string) {
    const supabase = createClient();

    // 1. Semantic TTFT Cache Check 
    const cached = await checkSemanticCache(machineId, query);
    if (cached) return cached;

    // 2. Parallel Embedding & Error Code Extraction
    const [queryVector, extractedCodes] = await Promise.all([
        generateEmbeddings(query),
        extractErrorCodes(query)
    ]);

    // 3. Parallel Vector + Deterministic Database Search
    //    Using match_manual_chunks and match_successful_history RPCs
    const [vectorResults, exactCodeResults, historyResults] = await Promise.all([
        supabase.rpc('match_manual_chunks', {
            query_embedding: queryVector,
            target_machine_id: machineId,
            match_threshold: 0.70,
            match_count: 5
        }),
        extractedCodes.length > 0
            ? supabase.from('machine_error_codes')
                .select('*')
                .eq('machine_id', machineId)
                .in('error_code', extractedCodes)
            : { data: [] },
        supabase.rpc('match_successful_history', {
            query_embedding: queryVector,
            target_machine_id: machineId,
            match_count: 2
        })
    ]);

    if (vectorResults.error) console.error('Vector RPC Error:', vectorResults.error);
    if (historyResults.error) console.error('History RPC Error:', historyResults.error);

    // 4. Gemini RCA Invocation
    const aiResponse = await generateRootCauseAnalysis(
        query,
        historyResults.data || [],
        exactCodeResults.data || [],
        vectorResults.data || []
    );

    // 5. Cache Strategy
    await setSemanticCache(machineId, query, aiResponse);
    return aiResponse;
}
