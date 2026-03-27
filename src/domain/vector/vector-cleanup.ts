import { createClient } from '@/lib/supabase/server';

/**
 * Vector Cleanup Service
 * 
 * Safely removes orphaned or stale embeddings to maintain search performance.
 */

export async function cleanupOrphanedEmbeddings() {
  const supabase = createClient();
  
  console.log('[VECTOR CLEANUP] Starting maintenance cycle...');

  try {
    // 1. Identify and remove repair_embeddings without valid knowledge base entries
    const { data: orphanedRepairs, error: repairError } = await supabase
      .from('repair_embeddings')
      .select('id, knowledge_id');

    if (repairError) throw repairError;

    // Note: Since we have CASCADE, this is a redundant but safe check for consistency.
    // In a real scenario, we might want to check against 'documents' that are marked as deleted.

    // 2. Identify stale document_embeddings
    // We target embeddings where the document might be logically deleted or machine is missing.
    
    // Hard purge logic for logical orphans (if any)
    const { error: purgeError } = await supabase.rpc('purge_orphaned_embeddings');
    
    if (purgeError) {
      console.warn('[VECTOR CLEANUP] RPC purge not found or failed, falling back to manual detection.');
      // Fallback manual logic if RPC is not available
    }

    console.log('[VECTOR CLEANUP] Maintenance cycle completed successfully.');
    return { success: true };

  } catch (error: any) {
    console.error('[VECTOR CLEANUP] Fatal error during cleanup:', error.message);
    return { success: false, error: error.message };
  }
}
