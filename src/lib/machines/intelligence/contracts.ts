/**
 * ENVIROJIM — AI Core Contracts v5
 * Rule: official documented answer is ALWAYS structurally separate from inferred non-official answer.
 * No silent mixing. No safe_to_order without official_confirmed part.
 */

// ─── Enums (mirror SQL) ───────────────────────────────────────────────────────

export type DocType =
  | 'operating_manual' | 'maintenance_manual' | 'faults_and_remedy'
  | 'spare_parts_list' | 'hydraulic_parts_list' | 'electrical_material_list'
  | 'short_manual' | 'service_bulletin' | 'other';

export type ParseStatus = 'queued' | 'parsed' | 'failed';
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'partial';

export type ExtractionObjectType =
  | 'machine_family' | 'machine' | 'subsystem' | 'component' | 'assembly'
  | 'part' | 'procedure' | 'maintenance_task' | 'fault_symptom' | 'fault_cause'
  | 'diagnostic_test' | 'checklist_template' | 'report_template' | 'log_signal';

export type PartValidationStatus =
  | 'official_confirmed' | 'extracted_needs_review' | 'conflict_detected' | 'blocked_incomplete';

export type QuantityStatus = 'exact' | 'estimated' | 'unknown_but_required';

export type ProcedureType =
  | 'startup' | 'shutdown' | 'cleaning' | 'inspection' | 'troubleshooting'
  | 'replacement' | 'maintenance' | 'emergency' | 'configuration' | 'other';

export type IntervalType = 'daily' | 'hours' | 'days' | 'weeks' | 'months' | 'years' | 'event_based';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type ResolutionStatus = 'open' | 'accepted' | 'resolved' | 'ignored';

export type ChecklistAudience = 'operator' | 'technician' | 'internal' | 'customer';

export type ChecklistType =
  | 'daily_operator' | 'daily_technician' | 'startup' | 'shutdown'
  | 'pre_delivery' | 'after_maintenance' | 'safety' | 'custom';

export type ReportType =
  | 'service_report' | 'bt' | 'inspection_report' | 'maintenance_report' | 'diagnostic_report';

export type SignalMappingStatus = 'not_yet_available' | 'future_mapping_required' | 'mapped_officially';

export type OrderSafetyStatus =
  | 'safe_to_order' | 'requires_visual_confirmation'
  | 'requires_serial_or_position_confirmation' | 'not_safe_to_order';

// ─── Evidence ────────────────────────────────────────────────────────────────

export interface EvidenceRef {
  source_document_id: string;
  source_page: number;
  source_snippet: string;
  normalized_excerpt: string;
  evidence_role: string;
  extraction_method: string;
  confidence_score: number; // 0–100
}

// ─── Part (official only) ────────────────────────────────────────────────────

export interface OfficialPart {
  id: string;
  part_number: string;       // never empty
  part_name: string;
  part_type: string;
  is_wear_part: boolean;
  is_consumable: boolean;
  quantity_status: QuantityStatus;
  quantity_value: number;
  unit: string;
  order_safety_status: OrderSafetyStatus;
  validation_status: PartValidationStatus;
  official_source_document_id: string;
  official_source_page: number;
  official_source_snippet: string;
  official_evidence_confidence: number;
}

export interface CandidatePart {
  part: OfficialPart;
  order_safety_status: OrderSafetyStatus;
  what_to_confirm_before_order: string[];
  evidence: EvidenceRef[];
}

// ─── Diagnostic two-block contract ───────────────────────────────────────────

export const INFERRED_DISCLAIMER =
  'La section suivante est une supposition IA basée sur des connaissances générales et non une réponse officielle confirmée par la documentation de cette machine.';

export interface OfficialDocumentedAnswer {
  found: true;
  affected_subsystems: string[];
  summary: string;
  cause_codes: string[];
  recommended_tests: string[];
  recommended_procedures: string[];
  candidate_parts: CandidatePart[];
  evidence: EvidenceRef[];
  documentary_confidence: number; // 0–100
}

export interface OfficialDocumentedAnswerEmpty {
  found: false;
  no_official_machine_answer_found: true;
}

export interface InferredNonOfficialAnswer {
  disclaimer: typeof INFERRED_DISCLAIMER;
  summary: string;
  inferred_causes: string[];
  inferred_parts: string[]; // part names only — never numbers, never safe_to_order
  inferred_procedures: string[];
  confidence_note: string;
}

// ─── Diagnostic output ───────────────────────────────────────────────────────

export interface DiagnosticOutput {
  normalized_problem: string;
  affected_subsystems: string[];
  official_documented_answer: OfficialDocumentedAnswer | OfficialDocumentedAnswerEmpty;
  inferred_non_official_answer: InferredNonOfficialAnswer | null;
  safety_alerts: string[];
  evidence: EvidenceRef[];
}

// ─── Parts assistant output ──────────────────────────────────────────────────

export interface PartsAssistantOutput {
  query: string;
  likely_subsystem: string | null;
  candidate_parts: CandidatePart[];      // official_confirmed only for safe_to_order
  order_safety_status: OrderSafetyStatus; // aggregate worst-case
  what_to_confirm_before_order: string[];
  evidence: EvidenceRef[];
  no_official_part_found: boolean;
  inferred_non_official_answer: InferredNonOfficialAnswer | null;
}

// ─── Maintenance assistant output ────────────────────────────────────────────

export interface MaintenanceTask {
  task_code: string;
  title: string;
  interval_type: IntervalType;
  interval_value: number;
  trigger_rule: string;
  severity_if_skipped: RiskLevel;
  required_parts: CandidatePart[];
  procedure_code: string;
  evidence: EvidenceRef[];
}

export interface MaintenanceAssistantOutput {
  machine_id: string;
  due_tasks: MaintenanceTask[];
  overdue_risk: RiskLevel;
  required_parts: CandidatePart[];
  procedures: string[];
  evidence: EvidenceRef[];
}

// ─── Checklist output ────────────────────────────────────────────────────────

export interface ChecklistItem {
  item_no: number;
  item_text: string;
  reason_text: string;
  expected_result: string;
  action_if_fail: string;
  evidence: EvidenceRef[];
}

export interface ChecklistOutput {
  checklist_title: string;
  audience: ChecklistAudience;
  checklist_type: ChecklistType;
  items: ChecklistItem[];
}

// ─── Tech report (BT) output ─────────────────────────────────────────────────

export interface TechReportOutput {
  symptom_observed: string;
  conditions_of_occurrence: string;
  tests_performed: string[];
  findings: string;
  probable_cause: string;
  confirmed_or_not_confirmed: 'confirmed' | 'not_confirmed' | 'pending';
  action_taken: string;
  parts_used: CandidatePart[];
  parts_recommended: CandidatePart[];
  follow_up: string;
  evidence: EvidenceRef[];
}

// ─── Bootstrap subsystem seeds ───────────────────────────────────────────────

export const BOOTSTRAP_SUBSYSTEMS = [
  'global', 'engine', 'hydraulics', 'shredding_unit',
  'conveyor', 'tracks', 'electrical_control',
  'remote_control', 'water_sprinkling', 'magnet',
] as const;

export type BootstrapSubsystem = typeof BOOTSTRAP_SUBSYSTEMS[number];

// ─── Data quality issue ──────────────────────────────────────────────────────

export interface DataQualityIssue {
  object_type: string;
  object_id: string;
  issue_type: string;
  issue_description: string;
  severity: RiskLevel;
  blocking_flag: boolean;
}
