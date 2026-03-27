/**
 * Maintenance payload enrichment transformers
 */

export interface EnrichedMaintenance {
  id: string;
  machine_id: string;
  title: string;
  description: string;
  maintenance_type: 'preventive' | 'predictive' | 'corrective' | 'emergency';
  interval_unit?: 'hours' | 'days' | 'months' | 'years';
  interval_value?: number;
  estimated_duration_minutes: number;
  required_tools: string[];
  required_parts: Array<{ part_name: string; quantity: number }>;
  preconditions: string[];
  post_checks: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  evidence_summary: string;
  checklist_steps: Array<{
    sequence: number;
    category: 'precondition' | 'main' | 'validation';
    description: string;
    estimated_time_minutes: number;
    required_tools?: string[];
    required_parts?: string[];
  }>;
}

export function enrichMaintenance(raw: any): EnrichedMaintenance {
  const maintenance_type = deriveMaintenanceType(raw.description ?? '');
  const { interval_unit, interval_value } = deriveInterval(raw);
  const estimated_duration_minutes = estimateDuration(raw.description ?? '', maintenance_type);
  const required_tools = extractTools(raw.description ?? '');
  const required_parts = extractParts(raw.related_parts ?? []);
  const preconditions = generatePreconditions(maintenance_type);
  const post_checks = generatePostChecks(maintenance_type);
  const priority = derivePriority(maintenance_type);
  const evidence_summary = `${maintenance_type} maintenance; Duration: ~${estimated_duration_minutes} min`;
  const checklist_steps = generateChecklist(maintenance_type, required_tools, required_parts);

  return {
    ...raw,
    maintenance_type,
    interval_unit,
    interval_value,
    estimated_duration_minutes,
    required_tools,
    required_parts,
    preconditions,
    post_checks,
    priority,
    evidence_summary,
    checklist_steps,
  };
}

function deriveMaintenanceType(description: string): 'preventive' | 'predictive' | 'corrective' | 'emergency' {
  const lower = description.toLowerCase();
  if (lower.includes('scheduled') || lower.includes('regular') || lower.includes('routine')) return 'preventive';
  if (lower.includes('condition') || lower.includes('monitor') || lower.includes('predict')) return 'predictive';
  if (lower.includes('repair') || lower.includes('fix') || lower.includes('corrective')) return 'corrective';
  if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('immediate')) return 'emergency';
  return 'preventive';
}

function deriveInterval(raw: any): { interval_unit?: string; interval_value?: number } {
  if (raw.interval_unit && raw.interval_value) {
    return { interval_unit: raw.interval_unit, interval_value: raw.interval_value };
  }
  const desc = (raw.description ?? '').toLowerCase();
  if (desc.includes('daily')) return { interval_unit: 'days', interval_value: 1 };
  if (desc.includes('weekly')) return { interval_unit: 'days', interval_value: 7 };
  if (desc.includes('monthly')) return { interval_unit: 'months', interval_value: 1 };
  if (desc.includes('quarterly')) return { interval_unit: 'months', interval_value: 3 };
  if (desc.includes('annually') || desc.includes('yearly')) return { interval_unit: 'months', interval_value: 12 };
  return {};
}

function estimateDuration(description: string, type: string): number {
  const lower = description.toLowerCase();
  if (type === 'emergency') return 60;
  if (type === 'corrective') return 45;
  if (lower.includes('inspection') || lower.includes('check')) return 15;
  if (lower.includes('replace') || lower.includes('install')) return 30;
  if (lower.includes('calibrate') || lower.includes('adjust')) return 20;
  return 25;
}

function extractTools(description: string): string[] {
  const tools = new Set<string>();
  const patterns: Record<string, string> = {
    wrench: 'wrench',
    screwdriver: 'screwdriver',
    multimeter: 'multimeter',
    gauge: 'pressure gauge',
    thermometer: 'thermometer',
    torque: 'torque wrench',
    lubricant: 'lubricant',
  };

  const lower = description.toLowerCase();
  for (const [pattern, tool] of Object.entries(patterns)) {
    if (lower.includes(pattern)) tools.add(tool);
  }

  return Array.from(tools).sort();
}

function extractParts(relatedParts: string[]): Array<{ part_name: string; quantity: number }> {
  return relatedParts.slice(0, 5).map((p, idx) => ({
    part_name: p,
    quantity: idx === 0 ? 1 : 1,
  }));
}

function generatePreconditions(type: string): string[] {
  const base = [
    'Ensure machine is properly powered down',
    'Allow 15 minutes for cool-down if applicable',
    'Clear work area of obstacles',
  ];

  if (type === 'emergency') {
    return ['Declare emergency status', 'Notify team members', ...base];
  }
  if (type === 'corrective') {
    return ['Review error logs', 'Diagnose root cause', ...base];
  }
  return base;
}

function generatePostChecks(type: string): string[] {
  return [
    'Verify all connections are secure',
    'Test system operation',
    'Document completion and observations',
    'Return tools to storage',
  ];
}

function derivePriority(type: string): 'critical' | 'high' | 'medium' | 'low' {
  if (type === 'emergency') return 'critical';
  if (type === 'corrective') return 'high';
  if (type === 'predictive') return 'medium';
  return 'low';
}

function generateChecklist(
  type: string,
  tools: string[],
  parts: Array<{ part_name: string; quantity: number }>
): Array<any> {
  const steps = [];

  // Preconditions
  steps.push({
    sequence: 1,
    category: 'precondition',
    description: 'Power down and secure the machine',
    estimated_time_minutes: 5,
  });
  steps.push({
    sequence: 2,
    category: 'precondition',
    description: 'Gather required tools and parts',
    estimated_time_minutes: 5,
    required_tools: tools.slice(0, 3),
    required_parts: parts.slice(0, 2).map(p => p.part_name),
  });

  // Main steps
  if (type === 'preventive' || type === 'predictive') {
    steps.push({
      sequence: 3,
      category: 'main',
      description: 'Perform inspection and measurements',
      estimated_time_minutes: 15,
      required_tools: tools.slice(0, 2),
    });
  }
  if (type === 'corrective' || type === 'emergency') {
    steps.push({
      sequence: 3,
      category: 'main',
      description: 'Replace or repair identified component',
      estimated_time_minutes: 20,
      required_tools: tools,
      required_parts: parts.map(p => p.part_name),
    });
  }

  // Validation
  steps.push({
    sequence: 4,
    category: 'validation',
    description: 'Run functional test and verify results',
    estimated_time_minutes: 10,
  });
  steps.push({
    sequence: 5,
    category: 'validation',
    description: 'Document completion in system',
    estimated_time_minutes: 5,
  });

  return steps;
}
