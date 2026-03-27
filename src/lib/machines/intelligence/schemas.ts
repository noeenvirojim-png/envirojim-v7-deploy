import { z } from 'zod';

export const KbConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const KbStatusSchema = z.enum(['confirmed', 'inferred', 'ambiguous', 'conflicting', 'unreadable', 'missing']);
export const KbCriticalitySchema = z.enum(['critical', 'high', 'medium', 'low']);

export const EvidenceSchema = z.object({
  source_file_name: z.string(),
  source_page: z.string().or(z.number()),
  section_title: z.string(),
  evidence_snippet: z.string(),
  confidence: KbConfidenceSchema
});

export const BaseKbEntitySchema = z.object({
  canonical_name: z.string(),
  original_label: z.string(),
  aliases: z.array(z.string()).default([]),
  language: z.string().default('en'),
  status: KbStatusSchema.default('confirmed'),
  confidence: KbConfidenceSchema.default('medium'),
  criticality: KbCriticalitySchema.default('medium'),
  evidence: z.array(EvidenceSchema).default([])
});

export const InventoryDocumentSchema = z.object({
  file_name: z.string(),
  document_type: z.string(),
  document_type_confidence: KbConfidenceSchema,
  language: z.string(),
  title_detected: z.string(),
  machine_reference_detected: z.string(),
  serial_or_machine_no_detected: z.string(),
  revision_or_date_detected: z.string(),
  is_primary_for_machine_truth: z.boolean().default(false),
  is_reference_only: z.boolean().default(false),
  extraction_priority: z.number().default(999),
  evidence: z.array(EvidenceSchema).default([])
});

export const DocumentInventoryResultSchema = z.object({
  documents: z.array(InventoryDocumentSchema),
  quality_gaps: z.array(z.string()).default([])
});

export const ProcedureStepSchema = z.object({
  order: z.number(),
  description: z.string(),
  illustration_ref: z.string().optional(),
  safety_warnings: z.array(z.string()).default([])
});

export const ProcedureSchema = BaseKbEntitySchema.extend({
  category: z.enum(['inspection', 'preventive', 'corrective', 'calibration', 'emergency']),
  steps: z.array(ProcedureStepSchema),
  duration: z.string().optional(),
  tools_required: z.array(z.string()).default([]),
  parts_required: z.array(z.string()).default([]),
  safety_precautions: z.string().optional()
});

export const WarningSchema = BaseKbEntitySchema.extend({
  warning_text: z.string(),
  consequence: z.string().optional(),
  mitigation: z.string().optional(),
  is_safety_critical: z.boolean().default(true)
});

export const MaintenanceTaskSchema = BaseKbEntitySchema.extend({
  interval_value: z.number().optional(),
  interval_unit: z.enum(['hours', 'days', 'months', 'conditional']).optional(),
  task_description: z.string(),
  lubricant_type: z.string().optional(),
  procedures_refs: z.array(z.string()).default([])
});

export const FaultCaseSchema = BaseKbEntitySchema.extend({
  symptom: z.string(),
  possible_causes: z.array(z.string()).default([]),
  diagnostic_steps: z.array(z.string()).default([]),
  remedies: z.array(z.string()).default([]),
  related_entities: z.array(z.string()).default([])
});

export const PartSchema = BaseKbEntitySchema.extend({
  part_number: z.string(),
  assembly_id: z.string().optional(),
  manufacturer: z.string().optional(),
  is_consumable: z.boolean().default(false),
  specifications: z.record(z.string()).default({})
});

export const TechnicalParameterSchema = BaseKbEntitySchema.extend({
  parameter_value: z.string(),
  unit: z.string().optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  nominal_value: z.number().optional()
});

export const DocumentExtractResultSchema = z.object({
  machine_identity: z.record(z.any()),
  sections: z.array(z.string()).default([]),
  warnings: z.array(WarningSchema).default([]),
  procedures: z.array(ProcedureSchema).default([]),
  maintenance_tasks: z.array(MaintenanceTaskSchema).default([]),
  fault_cases: z.array(FaultCaseSchema).default([]),
  parts: z.array(PartSchema).default([]),
  technical_parameters: z.array(TechnicalParameterSchema).default([]),
  contradictions_inside_document: z.array(z.string()).default([]),
  ambiguous_items: z.array(z.string()).default([]),
  unreadable_regions: z.array(z.string()).default([])
});

export const GraphicNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  metadata: z.record(z.any()).default({})
});

export const GraphicEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  relation: z.string(),
  confidence: KbConfidenceSchema,
  metadata: z.record(z.any()).default({})
});

export const GraphBuildResultSchema = z.object({
  nodes: z.array(GraphicNodeSchema),
  edges: z.array(GraphicEdgeSchema),
  quality_flags: z.array(z.string()).default([])
});

export const QaAuditResultSchema = z.object({
  production_ready: z.boolean(),
  overall_risk: z.string(),
  coverage_gaps: z.array(z.string()).default([]),
  weak_evidence_items: z.array(z.string()).default([]),
  safety_risks: z.array(z.string()).default([]),
  final_verdict: z.string()
});
