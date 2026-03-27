/**
 * ENVIROJIM — AI Core Zod Schemas v5
 * Validates all AI outputs before they leave a service.
 */

import { z } from 'zod';
import { INFERRED_DISCLAIMER } from './contracts';

// ─── Evidence ────────────────────────────────────────────────────────────────

export const EvidenceRefSchema = z.object({
  source_document_id: z.string().uuid(),
  source_page: z.number().int().positive(),
  source_snippet: z.string().min(1),
  normalized_excerpt: z.string().min(1),
  evidence_role: z.string().min(1),
  extraction_method: z.string().min(1),
  confidence_score: z.number().int().min(0).max(100),
});

// ─── Part ────────────────────────────────────────────────────────────────────

export const OrderSafetyStatusSchema = z.enum([
  'safe_to_order', 'requires_visual_confirmation',
  'requires_serial_or_position_confirmation', 'not_safe_to_order',
]);

export const PartValidationStatusSchema = z.enum([
  'official_confirmed', 'extracted_needs_review', 'conflict_detected', 'blocked_incomplete',
]);

export const OfficialPartSchema = z.object({
  id: z.string().uuid(),
  part_number: z.string().min(1),
  part_name: z.string().min(1),
  part_type: z.string().min(1),
  is_wear_part: z.boolean(),
  is_consumable: z.boolean(),
  quantity_status: z.enum(['exact', 'estimated', 'unknown_but_required']),
  quantity_value: z.number().nonnegative(),
  unit: z.string().min(1),
  order_safety_status: OrderSafetyStatusSchema,
  validation_status: PartValidationStatusSchema,
  official_source_document_id: z.string().uuid(),
  official_source_page: z.number().int().positive(),
  official_source_snippet: z.string().min(1),
  official_evidence_confidence: z.number().int().min(0).max(100),
});

export const CandidatePartSchema = z.object({
  part: OfficialPartSchema,
  order_safety_status: OrderSafetyStatusSchema,
  what_to_confirm_before_order: z.array(z.string()),
  evidence: z.array(EvidenceRefSchema),
});

// Enforce: safe_to_order only if official_confirmed
export const CandidatePartSafeSchema = CandidatePartSchema.refine(
  (cp) => !(cp.order_safety_status === 'safe_to_order' && cp.part.validation_status !== 'official_confirmed'),
  { message: 'safe_to_order requires validation_status=official_confirmed' },
);

// ─── Diagnostic ──────────────────────────────────────────────────────────────

export const InferredNonOfficialAnswerSchema = z.object({
  disclaimer: z.literal(INFERRED_DISCLAIMER),
  summary: z.string().min(1),
  inferred_causes: z.array(z.string()),
  inferred_parts: z.array(z.string()),   // names only — never numbers
  inferred_procedures: z.array(z.string()),
  confidence_note: z.string().min(1),
});

export const OfficialDocumentedAnswerSchema = z.discriminatedUnion('found', [
  z.object({
    found: z.literal(true),
    affected_subsystems: z.array(z.string()),
    summary: z.string().min(1),
    cause_codes: z.array(z.string()),
    recommended_tests: z.array(z.string()),
    recommended_procedures: z.array(z.string()),
    candidate_parts: z.array(CandidatePartSafeSchema),
    evidence: z.array(EvidenceRefSchema),
    documentary_confidence: z.number().int().min(0).max(100),
  }),
  z.object({
    found: z.literal(false),
    no_official_machine_answer_found: z.literal(true),
  }),
]);

export const DiagnosticOutputSchema = z.object({
  normalized_problem: z.string().min(1),
  affected_subsystems: z.array(z.string()),
  official_documented_answer: OfficialDocumentedAnswerSchema,
  inferred_non_official_answer: InferredNonOfficialAnswerSchema.nullable(),
  safety_alerts: z.array(z.string()),
  evidence: z.array(EvidenceRefSchema),
});

// ─── Parts assistant ─────────────────────────────────────────────────────────

export const PartsAssistantOutputSchema = z.object({
  query: z.string().min(1),
  likely_subsystem: z.string().nullable(),
  candidate_parts: z.array(CandidatePartSafeSchema),
  order_safety_status: OrderSafetyStatusSchema,
  what_to_confirm_before_order: z.array(z.string()),
  evidence: z.array(EvidenceRefSchema),
  no_official_part_found: z.boolean(),
  inferred_non_official_answer: InferredNonOfficialAnswerSchema.nullable(),
});

// ─── Maintenance ─────────────────────────────────────────────────────────────

export const MaintenanceTaskSchema = z.object({
  task_code: z.string().min(1),
  title: z.string().min(1),
  interval_type: z.enum(['daily', 'hours', 'days', 'weeks', 'months', 'years', 'event_based']),
  interval_value: z.number().int().positive(),
  trigger_rule: z.string().min(1),
  severity_if_skipped: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  required_parts: z.array(CandidatePartSafeSchema),
  procedure_code: z.string().min(1),
  evidence: z.array(EvidenceRefSchema),
});

export const MaintenanceAssistantOutputSchema = z.object({
  machine_id: z.string().uuid(),
  due_tasks: z.array(MaintenanceTaskSchema),
  overdue_risk: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  required_parts: z.array(CandidatePartSafeSchema),
  procedures: z.array(z.string()),
  evidence: z.array(EvidenceRefSchema),
});

// ─── Checklist ───────────────────────────────────────────────────────────────

export const ChecklistItemSchema = z.object({
  item_no: z.number().int().positive(),
  item_text: z.string().min(1),
  reason_text: z.string().min(1),
  expected_result: z.string().min(1),
  action_if_fail: z.string().min(1),
  evidence: z.array(EvidenceRefSchema),
});

export const ChecklistOutputSchema = z.object({
  checklist_title: z.string().min(1),
  audience: z.enum(['operator', 'technician', 'internal', 'customer']),
  checklist_type: z.enum([
    'daily_operator', 'daily_technician', 'startup', 'shutdown',
    'pre_delivery', 'after_maintenance', 'safety', 'custom',
  ]),
  items: z.array(ChecklistItemSchema).min(1),
});

// ─── Tech report ─────────────────────────────────────────────────────────────

export const TechReportOutputSchema = z.object({
  symptom_observed: z.string().min(1),
  conditions_of_occurrence: z.string().min(1),
  tests_performed: z.array(z.string()),
  findings: z.string().min(1),
  probable_cause: z.string().min(1),
  confirmed_or_not_confirmed: z.enum(['confirmed', 'not_confirmed', 'pending']),
  action_taken: z.string().min(1),
  parts_used: z.array(CandidatePartSafeSchema),
  parts_recommended: z.array(CandidatePartSafeSchema),
  follow_up: z.string().min(1),
  evidence: z.array(EvidenceRefSchema),
});
