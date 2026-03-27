/**
 * Ultimate Machine PDF Intelligence Pipeline Types
 * Version: 2026-03-19
 */

export type IngestionStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'needs_retry';
export type KbStatus = 'confirmed' | 'inferred' | 'ambiguous' | 'conflicting' | 'unreadable' | 'missing';
export type KbConfidence = 'high' | 'medium' | 'low';
export type KbCriticality = 'critical' | 'high' | 'medium' | 'low';
export type GraphType = 'system' | 'causal' | 'electrical' | 'hydraulic';

export interface Evidence {
  source_document_id: string;
  source_file_name: string;
  source_page: string;
  section_title: string;
  evidence_snippet: string;
  confidence: KbConfidence;
}

export interface BaseKbEntity {
  id?: string;
  canonical_name: string;
  original_label: string;
  aliases: string[];
  language: string;
  status: KbStatus;
  confidence: KbConfidence;
  criticality: KbCriticality;
  evidence: Evidence[];
  metadata: Record<string, any>;
}

export interface InventoryDocument {
  document_id: string;
  file_name: string;
  document_type: string;
  document_type_confidence: KbConfidence;
  language: string;
  title_detected: string;
  machine_reference_detected: string;
  serial_or_machine_no_detected: string;
  revision_or_date_detected: string;
  is_primary_for_machine_truth: boolean;
  is_reference_only: boolean;
  extraction_priority: number;
  notes: string;
}

export interface DocumentInventoryResult {
  run_id: string;
  documents: InventoryDocument[];
  quality_gaps: string[];
}

export interface ProcedureStep {
  order: number;
  description: string;
  illustration_ref?: string;
  safety_warnings?: string[];
}

export interface MachineProcedure extends BaseKbEntity {
  category: 'inspection' | 'preventive' | 'corrective' | 'calibration' | 'emergency';
  steps: ProcedureStep[];
  duration?: string;
  tools_required: string[];
  parts_required: string[];
  safety_precautions?: string;
}

export interface MaintenanceTask extends BaseKbEntity {
  interval_value?: number;
  interval_unit?: 'hours' | 'days' | 'months' | 'conditional';
  task_description: string;
  lubricant_type?: string;
  procedures_refs: string[];
}

export interface FaultCase extends BaseKbEntity {
  symptom: string;
  possible_causes: string[];
  diagnostic_steps: string[];
  remedies: string[];
  related_entities: string[];
}

export interface AssetPart extends BaseKbEntity {
  part_number: string;
  assembly_id?: string;
  manufacturer?: string;
  is_consumable: boolean;
  specifications: Record<string, string>;
}

export interface GraphicNode {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, any>;
}

export interface GraphicEdge {
  from: string;
  to: string;
  relation: string;
  confidence: KbConfidence;
  metadata: Record<string, any>;
}

export interface MachineMentalMap {
  machine_id: string;
  identity: Record<string, any>;
  systems: string[];
  assemblies_tree: any[];
  parts_index: string[];
  states: string[];
  flows: {
    material_flow: any[];
    energy_flow: any[];
    control_flow: any[];
  };
  critical_dependencies: string[];
  unknowns: string[];
  coverage_summary: Record<string, any>;
}
