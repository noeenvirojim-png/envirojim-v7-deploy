'use server';

import { requestPartFromKB } from './requestFromKB';
import type { EnrichedProcurementPart, validateProcurementPart } from '../transformers';

/**
 * Bridge: Accept enriched procurement part and create a part request
 */
export async function requestEnrichedPart(machineId: string, enriched: EnrichedProcurementPart) {
  // Validate minimum required fields
  if (!enriched.part_number || !enriched.part_name || !machineId) {
    return {
      success: false,
      error: 'Missing required part fields (part_number, part_name, machineId)',
    };
  }

  // Build notes from enriched metadata
  const notes = [
    enriched.notes || '',
    `Source: ${enriched.source}`,
    enriched.confidence && `Confidence: ${enriched.confidence}%`,
    enriched.safety_critical && 'SAFETY_CRITICAL: Yes',
    enriched.evidence_summary && `Evidence: ${enriched.evidence_summary}`,
  ]
    .filter(Boolean)
    .join(' | ');

  // Convert urgency from confidence/safety level
  let urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal';
  if (enriched.safety_critical) urgency = 'critical';
  else if (enriched.confidence > 90) urgency = 'high';
  else if (enriched.confidence < 50) urgency = 'low';

  // Call existing action with enriched data
  const result = await requestPartFromKB({
    machineId,
    partNumber: enriched.part_number,
    partName: enriched.part_name,
    quantity: enriched.requested_quantity || 1,
    urgency,
    notes,
  });

  if (result.success) {
    console.log(
      `[Procurement] Part request created: ${enriched.part_name} (${enriched.part_number}) - Lead time: ${enriched.estimated_lead_time_days}d, Est. cost: $${enriched.estimated_unit_cost}`
    );
  }

  return result;
}
