/**
 * Diagnostic payload enrichment transformers
 */

export interface EnrichedDiagnostic {
  machine_id: string;
  query: string;
  top_cluster_name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  likely_systems: string[];
  recommended_actions: Array<{
    action: string;
    priority: 'immediate' | 'urgent' | 'standard' | 'low';
    estimated_duration_minutes: number;
  }>;
  parts_to_check: Array<{
    part_name: string;
    reason: string;
    priority: 'critical' | 'important' | 'optional';
  }>;
  safety_level: 'safe' | 'caution' | 'hazard' | 'unknown';
  downtime_risk: 'none' | 'low' | 'medium' | 'high';
  evidence_summary: string;
  playbook_steps: Array<{
    step: number;
    title: string;
    description: string;
    type: string;
    completed: boolean;
  }>;
  related_faults: string[];
  related_maintenance: string[];
  related_parts: string[];
  evidence_refs: string[];
}

export function enrichDiagnostic(raw: any): EnrichedDiagnostic {
  const severity = deriveSeverity(raw.top_cluster_name, raw.related_faults?.length ?? 0);
  const confidence = deriveConfidence(raw.evidence_refs?.length ?? 0, raw.playbook_steps?.length ?? 0);
  const likely_systems = extractSystems(raw.top_cluster_name, raw.related_faults ?? []);
  const recommended_actions = generateActions(raw.playbook_steps ?? [], severity);
  const parts_to_check = mapPartsToPriority(raw.related_parts ?? []);
  const safety_level = deriveSafetyLevel(raw.top_cluster_name);
  const downtime_risk = deriveDowntimeRisk(severity, likely_systems);
  const evidence_summary = summarizeEvidence(raw);

  return {
    ...raw,
    severity,
    confidence,
    likely_systems,
    recommended_actions,
    parts_to_check,
    safety_level,
    downtime_risk,
    evidence_summary,
  };
}

function deriveSeverity(clusterName: string, faultCount: number): 'critical' | 'high' | 'medium' | 'low' {
  const lower = clusterName.toLowerCase();
  if (lower.includes('critical') || lower.includes('failure') || lower.includes('rupture')) return 'critical';
  if (lower.includes('high') || faultCount > 5) return 'high';
  if (lower.includes('medium') || faultCount > 2) return 'medium';
  return 'low';
}

function deriveConfidence(evidenceCount: number, stepCount: number): number {
  const base = Math.min(100, (evidenceCount + stepCount) * 10);
  return Math.max(20, Math.min(100, base));
}

function extractSystems(clusterName: string, faults: string[]): string[] {
  const systems = new Set<string>();
  const lower = clusterName.toLowerCase();

  const keywords: Record<string, string[]> = {
    'electrical': ['electrical', 'circuit', 'power', 'voltage'],
    'mechanical': ['mechanical', 'bearing', 'shaft', 'coupling', 'gear'],
    'hydraulic': ['hydraulic', 'pump', 'valve', 'pressure'],
    'thermal': ['thermal', 'temperature', 'cooling', 'heat'],
    'control': ['control', 'plc', 'automation', 'sensor'],
  };

  for (const [system, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) systems.add(system);
  }

  faults.forEach(f => {
    for (const [system, words] of Object.entries(keywords)) {
      if (words.some(w => f.toLowerCase().includes(w))) systems.add(system);
    }
  });

  return Array.from(systems).sort();
}

function generateActions(steps: any[], severity: string): Array<any> {
  const priorityMap: Record<string, 'immediate' | 'urgent' | 'standard' | 'low'> = {
    critical: 'immediate',
    high: 'urgent',
    medium: 'standard',
    low: 'low',
  };

  return steps
    .filter(s => !s.completed)
    .map((s, idx) => ({
      action: s.title || `Step ${s.step}`,
      priority: idx === 0 ? priorityMap[severity] : 'standard',
      estimated_duration_minutes: s.type === 'physical' ? 30 : 15,
    }))
    .slice(0, 5);
}

function mapPartsToPriority(parts: string[]): Array<any> {
  return parts.map((p, idx) => ({
    part_name: p,
    reason: 'Identified in diagnostic cluster',
    priority: idx === 0 ? 'critical' : idx < 3 ? 'important' : 'optional',
  }));
}

function deriveSafetyLevel(clusterName: string): 'safe' | 'caution' | 'hazard' | 'unknown' {
  const lower = clusterName.toLowerCase();
  if (lower.includes('electrical') || lower.includes('high voltage') || lower.includes('fire')) return 'hazard';
  if (lower.includes('pressure') || lower.includes('thermal') || lower.includes('rotating')) return 'caution';
  if (lower.includes('software') || lower.includes('data') || lower.includes('configuration')) return 'safe';
  return 'unknown';
}

function deriveDowntimeRisk(severity: string, systems: string[]): 'none' | 'low' | 'medium' | 'high' {
  if (severity === 'critical') return 'high';
  if (severity === 'high' || systems.includes('control')) return 'medium';
  if (severity === 'medium') return 'low';
  return 'none';
}

function summarizeEvidence(raw: any): string {
  const parts = [];
  if (raw.top_cluster_name) parts.push(`Cluster: ${raw.top_cluster_name}`);
  if (raw.related_faults?.length) parts.push(`${raw.related_faults.length} related faults`);
  if (raw.evidence_refs?.length) parts.push(`${raw.evidence_refs.length} evidence references`);
  if (raw.playbook_steps?.length) parts.push(`${raw.playbook_steps.filter((s: any) => s.completed).length}/${raw.playbook_steps.length} steps completed`);
  return parts.join('; ') || 'Diagnostic data available';
}
