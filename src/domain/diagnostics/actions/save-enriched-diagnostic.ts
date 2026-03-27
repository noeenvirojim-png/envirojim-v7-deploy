'use server';

import { saveDiagnosticSession } from './save-diagnostic';
import type { EnrichedDiagnostic } from '../transformers';

/**
 * Bridge: Accept enriched diagnostic payload and convert to save-diagnostic compatible format
 */
export async function saveDiagnosticFromEnriched(
  enriched: Partial<EnrichedDiagnostic>
) {
  if (!enriched.machine_id || !enriched.query || !enriched.top_cluster_name) {
    return { success: false, error: 'Missing required diagnostic fields' };
  }

  // Convert enriched format to saveDiagnosticSession format
  const sessionData = {
    machine_id: enriched.machine_id,
    query: enriched.query,
    top_cluster_name: enriched.top_cluster_name,
    playbook_steps: enriched.playbook_steps ?? [],
    related_faults: enriched.related_faults ?? [],
    related_maintenance: enriched.related_maintenance ?? [],
    related_parts: enriched.related_parts ?? [],
    evidence_refs: enriched.evidence_refs ?? [],
  };

  // Call existing action with enriched data
  const result = await saveDiagnosticSession(sessionData);

  if (result.success && enriched.severity && enriched.confidence) {
    // Log enriched metadata for future retrieval
    console.log(`[Diagnostic] Saved with severity=${enriched.severity}, confidence=${enriched.confidence}%`);
  }

  return result;
}
