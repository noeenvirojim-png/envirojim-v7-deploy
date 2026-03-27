/**
 * ENVIROJIM — Synthetic Source Guard
 * Central enforcement: synthetic sources cannot confirm anything official.
 *
 * A source_document with is_synthetic=true is a bootstrap placeholder.
 * It MUST NEVER:
 *   - produce validation_status='official_confirmed' on a part
 *   - produce order_safety_status='safe_to_order'
 *   - be included in official diagnostic evidence
 *   - count as a real evidence record for any official answer
 */

export const SYNTHETIC_DOC_KEY = 'bootstrap';

export function assertNotSynthetic(
  sourceDocumentId: string,
  isSynthetic: boolean,
  context: string,
): void {
  if (isSynthetic) {
    throw new Error(
      `SyntheticGuard[${context}]: source_document ${sourceDocumentId} is synthetic — ` +
      `cannot produce official evidence, confirmed parts, or safe_to_order.`,
    );
  }
}

export function isSyntheticDocKey(docKey: string): boolean {
  return docKey === SYNTHETIC_DOC_KEY || docKey.startsWith('bootstrap');
}

/**
 * Filter evidence list to real (non-synthetic) sources only.
 */
export function filterRealEvidence<T extends { source_document_id: string }>(
  evidence: T[],
  syntheticDocIds: Set<string>,
): T[] {
  return evidence.filter(e => !syntheticDocIds.has(e.source_document_id));
}
