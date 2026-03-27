/**
 * Parts/Procurement payload enrichment transformers
 */

export interface EnrichedProcurementPart {
  id?: string;
  part_number: string;
  part_name: string;
  machine_id: string;
  source: 'ai_diagnostic' | 'ai_maintenance' | 'ai_kb' | 'manual';
  confidence: number; // 0-100
  evidence_summary: string;
  requested_quantity: number;
  notes?: string;
  safety_critical: boolean;
  estimated_lead_time_days?: number;
  estimated_unit_cost?: number;
}

export function enrichPartForProcurement(raw: any, source: string = 'ai_kb'): EnrichedProcurementPart {
  const part_number = extractPartNumber(raw.part_name ?? raw.name ?? '');
  const part_name = raw.part_name ?? raw.name ?? 'Unknown Part';
  const machine_id = raw.machine_id ?? '';
  const confidence = raw.confidence ?? 75;
  const evidence_summary = raw.evidence_summary ?? `Identified from ${source}`;
  const requested_quantity = raw.requested_quantity ?? 1;
  const notes = raw.notes ?? `Source: ${source}`;
  const safety_critical = detectSafetyCritical(part_name);
  const estimated_lead_time_days = estimateLeadTime(part_name);
  const estimated_unit_cost = estimateCost(part_name);

  return {
    part_number,
    part_name,
    machine_id,
    source: (source as any),
    confidence,
    evidence_summary,
    requested_quantity,
    notes,
    safety_critical,
    estimated_lead_time_days,
    estimated_unit_cost,
  };
}

function extractPartNumber(partName: string): string {
  // Try to extract part number from name or use name itself
  const match = partName.match(/([A-Z0-9]{2,}[-_]?[0-9]{2,})/);
  if (match) return match[1];
  // Use first 10 chars as fallback
  return partName.slice(0, 10).toUpperCase().replace(/\s+/g, '-');
}

function detectSafetyCritical(partName: string): boolean {
  const critical_keywords = [
    'brake',
    'bearing',
    'seal',
    'valve',
    'pump',
    'electrical',
    'fuse',
    'circuit',
    'sensor',
  ];
  const lower = partName.toLowerCase();
  return critical_keywords.some(kw => lower.includes(kw));
}

function estimateLeadTime(partName: string): number {
  const lower = partName.toLowerCase();
  if (lower.includes('standard') || lower.includes('common')) return 3;
  if (lower.includes('special') || lower.includes('custom')) return 14;
  if (lower.includes('electrical') || lower.includes('electronic')) return 7;
  if (lower.includes('bearing') || lower.includes('seal')) return 5;
  return 7;
}

function estimateCost(partName: string): number {
  const lower = partName.toLowerCase();
  if (lower.includes('bearing') || lower.includes('pump')) return 150;
  if (lower.includes('seal') || lower.includes('gasket')) return 25;
  if (lower.includes('electrical') || lower.includes('controller')) return 300;
  if (lower.includes('sensor')) return 80;
  return 100;
}

export function validateProcurementPart(part: EnrichedProcurementPart): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!part.part_number || part.part_number.trim().length === 0) {
    errors.push('Part number is required');
  }

  if (!part.part_name || part.part_name.trim().length === 0) {
    errors.push('Part name is required');
  }

  if (!part.machine_id || part.machine_id.trim().length === 0) {
    errors.push('Machine ID is required');
  }

  if (part.requested_quantity < 1) {
    errors.push('Quantity must be at least 1');
  }

  if (part.confidence < 0 || part.confidence > 100) {
    errors.push('Confidence must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeProcurementPayload(raw: any): Partial<EnrichedProcurementPart> {
  return {
    part_number: raw.part_number || raw.partNumber || extractPartNumber(raw.part_name || raw.partName || ''),
    part_name: raw.part_name || raw.partName || raw.name || '',
    machine_id: raw.machine_id || raw.machineId || '',
    requested_quantity: raw.requested_quantity || raw.requestedQuantity || 1,
    notes: raw.notes || raw.note || '',
    confidence: raw.confidence ?? 75,
  };
}
