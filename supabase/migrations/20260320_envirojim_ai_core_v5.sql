BEGIN;
 
CREATE EXTENSION IF NOT EXISTS pgcrypto;
 
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doc_type_enum') THEN
    CREATE TYPE doc_type_enum AS ENUM (
      'operating_manual',
      'maintenance_manual',
      'faults_and_remedy',
      'spare_parts_list',
      'hydraulic_parts_list',
      'electrical_material_list',
      'short_manual',
      'service_bulletin',
      'other'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parse_status_enum') THEN
    CREATE TYPE parse_status_enum AS ENUM ('queued','parsed','failed');
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status_enum') THEN
    CREATE TYPE run_status_enum AS ENUM ('queued','running','succeeded','failed','partial');
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_object_type_enum') THEN
    CREATE TYPE extraction_object_type_enum AS ENUM (
      'machine_family',
      'machine',
      'subsystem',
      'component',
      'assembly',
      'part',
      'procedure',
      'maintenance_task',
      'fault_symptom',
      'fault_cause',
      'diagnostic_test',
      'checklist_template',
      'report_template',
      'log_signal'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'part_validation_status_enum') THEN
    CREATE TYPE part_validation_status_enum AS ENUM (
      'official_confirmed',
      'extracted_needs_review',
      'conflict_detected',
      'blocked_incomplete'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quantity_status_enum') THEN
    CREATE TYPE quantity_status_enum AS ENUM (
      'exact',
      'estimated',
      'unknown_but_required'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'procedure_type_enum') THEN
    CREATE TYPE procedure_type_enum AS ENUM (
      'startup',
      'shutdown',
      'cleaning',
      'inspection',
      'troubleshooting',
      'replacement',
      'maintenance',
      'emergency',
      'configuration',
      'other'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interval_type_enum') THEN
    CREATE TYPE interval_type_enum AS ENUM (
      'daily',
      'hours',
      'days',
      'weeks',
      'months',
      'years',
      'event_based'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level_enum') THEN
    CREATE TYPE risk_level_enum AS ENUM (
      'none',
      'low',
      'medium',
      'high',
      'critical'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resolution_status_enum') THEN
    CREATE TYPE resolution_status_enum AS ENUM (
      'open',
      'accepted',
      'resolved',
      'ignored'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_audience_enum') THEN
    CREATE TYPE checklist_audience_enum AS ENUM (
      'operator',
      'technician',
      'internal',
      'customer'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_type_enum') THEN
    CREATE TYPE checklist_type_enum AS ENUM (
      'daily_operator',
      'daily_technician',
      'startup',
      'shutdown',
      'pre_delivery',
      'after_maintenance',
      'safety',
      'custom'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type_enum') THEN
    CREATE TYPE report_type_enum AS ENUM (
      'service_report',
      'bt',
      'inspection_report',
      'maintenance_report',
      'diagnostic_report'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signal_mapping_status_enum') THEN
    CREATE TYPE signal_mapping_status_enum AS ENUM (
      'not_yet_available',
      'future_mapping_required',
      'mapped_officially'
    );
  END IF;
 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_safety_status_enum') THEN
    CREATE TYPE order_safety_status_enum AS ENUM (
      'safe_to_order',
      'requires_visual_confirmation',
      'requires_serial_or_position_confirmation',
      'not_safe_to_order'
    );
  END IF;
END$$;
 
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
 
CREATE TABLE IF NOT EXISTS public.machine_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code text NOT NULL,
  manufacturer text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  variant text NOT NULL DEFAULT 'not_in_source_document',
  description text NOT NULL DEFAULT 'not_in_source_document',
  engine_model text NOT NULL DEFAULT 'not_in_source_document',
  power_kw numeric(12,2) NOT NULL DEFAULT 0 CHECK (power_kw >= 0),
  operating_weight_kg numeric(12,2) NOT NULL DEFAULT 0 CHECK (operating_weight_kg >= 0),
  intended_use_summary text NOT NULL DEFAULT 'unknown_but_required',
  forbidden_use_summary text NOT NULL DEFAULT 'unknown_but_required',
  ambient_operating_limits text NOT NULL DEFAULT 'unknown_but_required',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(family_code) <> ''),
  CHECK (btrim(manufacturer) <> ''),
  CHECK (btrim(brand) <> ''),
  CHECK (btrim(model) <> ''),
  CHECK (btrim(variant) <> ''),
  CHECK (btrim(description) <> ''),
  CHECK (btrim(engine_model) <> ''),
  CHECK (btrim(intended_use_summary) <> ''),
  CHECK (btrim(forbidden_use_summary) <> ''),
  CHECK (btrim(ambient_operating_limits) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_machine_families_family_code
  ON public.machine_families (lower(family_code));
 
CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  display_name text NOT NULL,
  year_or_generation text NOT NULL DEFAULT 'not_in_source_document',
  delivery_status text NOT NULL DEFAULT 'new',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(serial_number) <> ''),
  CHECK (btrim(display_name) <> ''),
  CHECK (btrim(year_or_generation) <> ''),
  CHECK (btrim(delivery_status) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_machines_family_serial
  ON public.machines (family_id, lower(serial_number));
 
CREATE TABLE IF NOT EXISTS public.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  doc_key text NOT NULL,
  title text NOT NULL,
  doc_type doc_type_enum NOT NULL,
  language_code text NOT NULL DEFAULT 'en',
  revision_label text NOT NULL DEFAULT 'not_in_source_document',
  source_filename text NOT NULL,
  file_sha256 text NOT NULL,
  page_count integer NOT NULL CHECK (page_count > 0),
  storage_path text NOT NULL,
  parse_status parse_status_enum NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(doc_key) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(language_code) <> ''),
  CHECK (btrim(revision_label) <> ''),
  CHECK (btrim(source_filename) <> ''),
  CHECK (btrim(file_sha256) <> ''),
  CHECK (btrim(storage_path) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_documents_family_doc_key
  ON public.source_documents (family_id, lower(doc_key));
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_documents_sha256
  ON public.source_documents (file_sha256);
 
CREATE TABLE IF NOT EXISTS public.document_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  page_number integer NOT NULL CHECK (page_number > 0),
  raw_text text NOT NULL DEFAULT '',
  normalized_text text NOT NULL DEFAULT '',
  page_sha256 text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_pages_doc_page
  ON public.document_pages (source_document_id, page_number);
 
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  status run_status_enum NOT NULL DEFAULT 'queued',
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);
 
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_family_status
  ON public.ingestion_runs (family_id, status);
 
CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingestion_run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  object_type extraction_object_type_enum NOT NULL,
  status run_status_enum NOT NULL DEFAULT 'queued',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  error_message text NOT NULL DEFAULT '',
  stats_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (finished_at IS NULL OR finished_at >= started_at),
  CHECK (jsonb_typeof(stats_json) = 'object')
);
 
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_run_object
  ON public.extraction_jobs (ingestion_run_id, object_type, status);
 
CREATE TABLE IF NOT EXISTS public.subsystems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  safety_critical boolean NOT NULL DEFAULT false,
  diagnostic_priority_rank integer NOT NULL DEFAULT 100 CHECK (diagnostic_priority_rank > 0),
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(subsystem_code) <> ''),
  CHECK (btrim(name) <> ''),
  CHECK (btrim(category) <> ''),
  CHECK (btrim(description) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_subsystems_family_code
  ON public.subsystems (family_id, lower(subsystem_code));
 
CREATE TABLE IF NOT EXISTS public.components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  component_code text NOT NULL,
  name text NOT NULL,
  function_summary text NOT NULL,
  location_summary text NOT NULL,
  component_type text NOT NULL,
  serviceable_flag boolean NOT NULL DEFAULT true,
  safety_critical_flag boolean NOT NULL DEFAULT false,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(component_code) <> ''),
  CHECK (btrim(name) <> ''),
  CHECK (btrim(function_summary) <> ''),
  CHECK (btrim(location_summary) <> ''),
  CHECK (btrim(component_type) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_components_family_code
  ON public.components (family_id, lower(component_code));
 
CREATE INDEX IF NOT EXISTS idx_components_subsystem
  ON public.components (subsystem_id);
 
CREATE TABLE IF NOT EXISTS public.assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  parent_assembly_id uuid NULL REFERENCES public.assemblies(id) ON DELETE SET NULL,
  assembly_code text NOT NULL,
  assembly_name text NOT NULL,
  assembly_type text NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(assembly_code) <> ''),
  CHECK (btrim(assembly_name) <> ''),
  CHECK (btrim(assembly_type) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_assemblies_family_code
  ON public.assemblies (family_id, lower(assembly_code));
 
CREATE INDEX IF NOT EXISTS idx_assemblies_subsystem
  ON public.assemblies (subsystem_id);
 
CREATE TABLE IF NOT EXISTS public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  primary_assembly_id uuid NOT NULL REFERENCES public.assemblies(id) ON DELETE RESTRICT,
  primary_component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE RESTRICT,
  part_number text NOT NULL,
  part_name text NOT NULL,
  normalized_part_name text NOT NULL,
  part_type text NOT NULL,
  is_wear_part boolean NOT NULL DEFAULT false,
  is_consumable boolean NOT NULL DEFAULT false,
  is_orderable boolean NOT NULL DEFAULT true,
  quantity_status quantity_status_enum NOT NULL DEFAULT 'exact',
  quantity_value numeric(12,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ea',
  order_safety_status order_safety_status_enum NOT NULL DEFAULT 'not_safe_to_order',
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  official_evidence_confidence integer NOT NULL DEFAULT 100 CHECK (official_evidence_confidence BETWEEN 0 AND 100),
  validation_status part_validation_status_enum NOT NULL DEFAULT 'extracted_needs_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(part_number) <> ''),
  CHECK (btrim(part_name) <> ''),
  CHECK (btrim(normalized_part_name) <> ''),
  CHECK (btrim(part_type) <> ''),
  CHECK (btrim(unit) <> ''),
  CHECK (btrim(official_source_snippet) <> ''),
  CHECK (
    (quantity_status = 'exact' AND quantity_value > 0) OR
    (quantity_status <> 'exact' AND quantity_value >= 0)
  ),
  CHECK (
    NOT (
      validation_status = 'official_confirmed'
      AND (
        official_source_document_id IS NULL OR
        official_source_page IS NULL OR
        btrim(official_source_snippet) = ''
      )
    )
  )
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_parts_family_part_number
  ON public.parts (family_id, lower(part_number));
 
CREATE INDEX IF NOT EXISTS idx_parts_subsystem
  ON public.parts (subsystem_id);
 
CREATE INDEX IF NOT EXISTS idx_parts_component
  ON public.parts (primary_component_id);
 
CREATE INDEX IF NOT EXISTS idx_parts_validation
  ON public.parts (validation_status, order_safety_status);
 
CREATE TABLE IF NOT EXISTS public.part_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_type text NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(alias) <> ''),
  CHECK (btrim(alias_type) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_part_aliases_part_alias
  ON public.part_aliases (part_id, lower(alias));
 
CREATE TABLE IF NOT EXISTS public.part_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  assembly_id uuid NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  position_label text NOT NULL,
  position_description text NOT NULL,
  fitment_scope text NOT NULL DEFAULT 'family',
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(position_label) <> ''),
  CHECK (btrim(position_description) <> ''),
  CHECK (btrim(fitment_scope) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE INDEX IF NOT EXISTS idx_part_positions_part
  ON public.part_positions (part_id);
 
CREATE TABLE IF NOT EXISTS public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  procedure_code text NOT NULL,
  title text NOT NULL,
  procedure_type procedure_type_enum NOT NULL,
  purpose text NOT NULL,
  prerequisites text NOT NULL,
  safety_notes text NOT NULL,
  tools_required text NOT NULL,
  completion_criteria text NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(procedure_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(purpose) <> ''),
  CHECK (btrim(prerequisites) <> ''),
  CHECK (btrim(safety_notes) <> ''),
  CHECK (btrim(tools_required) <> ''),
  CHECK (btrim(completion_criteria) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_procedures_family_code
  ON public.procedures (family_id, lower(procedure_code));
 
CREATE INDEX IF NOT EXISTS idx_procedures_subsystem
  ON public.procedures (subsystem_id);
 
CREATE TABLE IF NOT EXISTS public.procedure_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  step_no integer NOT NULL CHECK (step_no > 0),
  instruction text NOT NULL,
  expected_result text NOT NULL,
  safety_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(instruction) <> ''),
  CHECK (btrim(expected_result) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_steps_order
  ON public.procedure_steps (procedure_id, step_no);
 
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  linked_procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
  task_code text NOT NULL,
  title text NOT NULL,
  interval_type interval_type_enum NOT NULL,
  interval_value integer NOT NULL CHECK (interval_value > 0),
  trigger_rule text NOT NULL,
  task_description text NOT NULL,
  severity_if_skipped risk_level_enum NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(task_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(trigger_rule) <> ''),
  CHECK (btrim(task_description) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_tasks_family_code
  ON public.maintenance_tasks (family_id, lower(task_code));
 
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_subsystem
  ON public.maintenance_tasks (subsystem_id, interval_type, interval_value);
 
CREATE TABLE IF NOT EXISTS public.maintenance_task_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_task_id uuid NOT NULL REFERENCES public.maintenance_tasks(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  requirement_kind text NOT NULL,
  quantity_status quantity_status_enum NOT NULL DEFAULT 'exact',
  quantity_value numeric(12,3) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ea',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(requirement_kind) <> ''),
  CHECK (btrim(unit) <> ''),
  CHECK (
    (quantity_status = 'exact' AND quantity_value > 0) OR
    (quantity_status <> 'exact' AND quantity_value >= 0)
  )
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_task_parts_unique
  ON public.maintenance_task_parts (maintenance_task_id, part_id);
 
CREATE TABLE IF NOT EXISTS public.fault_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  symptom_code text NOT NULL,
  title text NOT NULL,
  normalized_symptom text NOT NULL,
  symptom_type text NOT NULL,
  operator_wording_examples_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity_default risk_level_enum NOT NULL,
  stoppage_risk risk_level_enum NOT NULL,
  safety_risk risk_level_enum NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(symptom_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(normalized_symptom) <> ''),
  CHECK (btrim(symptom_type) <> ''),
  CHECK (btrim(official_source_snippet) <> ''),
  CHECK (jsonb_typeof(operator_wording_examples_json) = 'array')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_fault_symptoms_family_code
  ON public.fault_symptoms (family_id, lower(symptom_code));
 
CREATE INDEX IF NOT EXISTS idx_fault_symptoms_normalized
  ON public.fault_symptoms (family_id, lower(normalized_symptom));
 
CREATE TABLE IF NOT EXISTS public.fault_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  cause_code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  cause_type text NOT NULL,
  confirmatory_signs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  disconfirming_signs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(cause_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(description) <> ''),
  CHECK (btrim(cause_type) <> ''),
  CHECK (btrim(official_source_snippet) <> ''),
  CHECK (jsonb_typeof(confirmatory_signs_json) = 'array'),
  CHECK (jsonb_typeof(disconfirming_signs_json) = 'array')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_fault_causes_family_code
  ON public.fault_causes (family_id, lower(cause_code));
 
CREATE TABLE IF NOT EXISTS public.fault_cause_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cause_id uuid NOT NULL REFERENCES public.fault_causes(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_fault_cause_parts_unique
  ON public.fault_cause_parts (cause_id, part_id);
 
CREATE TABLE IF NOT EXISTS public.fault_cause_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cause_id uuid NOT NULL REFERENCES public.fault_causes(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_fault_cause_procedures_unique
  ON public.fault_cause_procedures (cause_id, procedure_id);
 
CREATE TABLE IF NOT EXISTS public.diagnostic_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  test_code text NOT NULL,
  title text NOT NULL,
  test_purpose text NOT NULL,
  expected_outcomes_summary text NOT NULL,
  interpretation_rules_summary text NOT NULL,
  safety_notes text NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(test_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(test_purpose) <> ''),
  CHECK (btrim(expected_outcomes_summary) <> ''),
  CHECK (btrim(interpretation_rules_summary) <> ''),
  CHECK (btrim(safety_notes) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnostic_tests_family_code
  ON public.diagnostic_tests (family_id, lower(test_code));
 
CREATE TABLE IF NOT EXISTS public.diagnostic_test_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_test_id uuid NOT NULL REFERENCES public.diagnostic_tests(id) ON DELETE CASCADE,
  step_no integer NOT NULL CHECK (step_no > 0),
  instruction text NOT NULL,
  expected_outcome text NOT NULL,
  interpretation_if_fail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(instruction) <> ''),
  CHECK (btrim(expected_outcome) <> ''),
  CHECK (btrim(interpretation_if_fail) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnostic_test_steps_order
  ON public.diagnostic_test_steps (diagnostic_test_id, step_no);
 
CREATE TABLE IF NOT EXISTS public.diagnostic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.fault_symptoms(id) ON DELETE CASCADE,
  cause_id uuid NOT NULL REFERENCES public.fault_causes(id) ON DELETE CASCADE,
  primary_test_id uuid NOT NULL REFERENCES public.diagnostic_tests(id) ON DELETE RESTRICT,
  likelihood_rank integer NOT NULL CHECK (likelihood_rank > 0),
  documentary_confidence integer NOT NULL CHECK (documentary_confidence BETWEEN 0 AND 100),
  conditions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_first_checks_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(official_source_snippet) <> ''),
  CHECK (jsonb_typeof(conditions_json) = 'array'),
  CHECK (jsonb_typeof(recommended_first_checks_json) = 'array')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnostic_links_symptom_cause
  ON public.diagnostic_links (symptom_id, cause_id);
 
CREATE INDEX IF NOT EXISTS idx_diagnostic_links_symptom_rank
  ON public.diagnostic_links (symptom_id, likelihood_rank, documentary_confidence DESC);
 
CREATE TABLE IF NOT EXISTS public.diagnostic_link_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_link_id uuid NOT NULL REFERENCES public.diagnostic_links(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  ranking integer NOT NULL CHECK (ranking > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnostic_link_parts_unique
  ON public.diagnostic_link_parts (diagnostic_link_id, part_id);
 
CREATE TABLE IF NOT EXISTS public.diagnostic_link_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_link_id uuid NOT NULL REFERENCES public.diagnostic_links(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES public.procedures(id) ON DELETE RESTRICT,
  ranking integer NOT NULL CHECK (ranking > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnostic_link_procedures_unique
  ON public.diagnostic_link_procedures (diagnostic_link_id, procedure_id);
 
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  template_code text NOT NULL,
  title text NOT NULL,
  audience checklist_audience_enum NOT NULL,
  checklist_type checklist_type_enum NOT NULL,
  trigger_rule text NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(template_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(trigger_rule) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_templates_family_code
  ON public.checklist_templates (family_id, lower(template_code));
 
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  item_no integer NOT NULL CHECK (item_no > 0),
  item_text text NOT NULL,
  reason_text text NOT NULL,
  expected_result text NOT NULL,
  action_if_fail text NOT NULL,
  official_source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  official_source_page integer NOT NULL CHECK (official_source_page > 0),
  official_source_snippet text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(item_text) <> ''),
  CHECK (btrim(reason_text) <> ''),
  CHECK (btrim(expected_result) <> ''),
  CHECK (btrim(action_if_fail) <> ''),
  CHECK (btrim(official_source_snippet) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_items_order
  ON public.checklist_items (checklist_template_id, item_no);
 
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  template_code text NOT NULL,
  title text NOT NULL,
  report_type report_type_enum NOT NULL,
  official_basis_summary text NOT NULL,
  source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(template_code) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (btrim(official_basis_summary) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_templates_family_code
  ON public.report_templates (family_id, lower(template_code));
 
CREATE TABLE IF NOT EXISTS public.report_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  section_no integer NOT NULL CHECK (section_no > 0),
  section_key text NOT NULL,
  section_label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  guidance_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(section_key) <> ''),
  CHECK (btrim(section_label) <> ''),
  CHECK (btrim(guidance_text) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_template_sections_order
  ON public.report_template_sections (report_template_id, section_no);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_template_sections_key
  ON public.report_template_sections (report_template_id, lower(section_key));
 
CREATE TABLE IF NOT EXISTS public.log_signal_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  subsystem_id uuid NOT NULL REFERENCES public.subsystems(id) ON DELETE CASCADE,
  signal_code text NOT NULL,
  signal_name text NOT NULL,
  signal_type text NOT NULL,
  expected_unit text NOT NULL DEFAULT 'not_in_source_document',
  interpretation_mode text NOT NULL DEFAULT 'future_mapping_required',
  official_mapping_status signal_mapping_status_enum NOT NULL DEFAULT 'not_yet_available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(signal_code) <> ''),
  CHECK (btrim(signal_name) <> ''),
  CHECK (btrim(signal_type) <> ''),
  CHECK (btrim(expected_unit) <> ''),
  CHECK (btrim(interpretation_mode) <> '')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_log_signal_registry_family_code
  ON public.log_signal_registry (family_id, lower(signal_code));
 
CREATE TABLE IF NOT EXISTS public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE RESTRICT,
  source_page integer NOT NULL CHECK (source_page > 0),
  source_snippet text NOT NULL,
  normalized_excerpt text NOT NULL,
  evidence_role text NOT NULL DEFAULT 'primary',
  extraction_method text NOT NULL,
  confidence_score integer NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(object_type) <> ''),
  CHECK (btrim(source_snippet) <> ''),
  CHECK (btrim(normalized_excerpt) <> ''),
  CHECK (btrim(evidence_role) <> ''),
  CHECK (btrim(extraction_method) <> '')
);
 
CREATE INDEX IF NOT EXISTS idx_evidence_object
  ON public.evidence (object_type, object_id);
 
CREATE INDEX IF NOT EXISTS idx_evidence_source
  ON public.evidence (source_document_id, source_page);
 
CREATE TABLE IF NOT EXISTS public.data_quality_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  issue_type text NOT NULL,
  issue_description text NOT NULL,
  severity risk_level_enum NOT NULL,
  blocking_flag boolean NOT NULL DEFAULT true,
  resolution_status resolution_status_enum NOT NULL DEFAULT 'open',
  detected_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(object_type) <> ''),
  CHECK (btrim(issue_type) <> ''),
  CHECK (btrim(issue_description) <> ''),
  CHECK (btrim(detected_by) <> '')
);
 
CREATE INDEX IF NOT EXISTS idx_data_quality_blockers
  ON public.data_quality_issues (family_id, blocking_flag, resolution_status, severity);
 
CREATE TABLE IF NOT EXISTS public.inference_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.machine_families(id) ON DELETE CASCADE,
  allow_non_official_inference boolean NOT NULL DEFAULT true,
  allow_world_knowledge_fallback boolean NOT NULL DEFAULT true,
  must_show_disclaimer boolean NOT NULL DEFAULT true,
  must_separate_official_and_inferred boolean NOT NULL DEFAULT true,
  promotion_rules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(promotion_rules_json) = 'object')
);
 
CREATE UNIQUE INDEX IF NOT EXISTS uq_inference_policies_family
  ON public.inference_policies (family_id);
 
CREATE OR REPLACE VIEW public.vw_official_confirmed_parts AS
SELECT
  p.*
FROM public.parts p
WHERE p.validation_status = 'official_confirmed'
  AND p.official_source_document_id IS NOT NULL
  AND p.official_source_page IS NOT NULL
  AND btrim(p.official_source_snippet) <> '';
 
CREATE OR REPLACE VIEW public.vw_blocking_data_quality_issues AS
SELECT
  dqi.*
FROM public.data_quality_issues dqi
WHERE dqi.blocking_flag = true
  AND dqi.resolution_status <> 'resolved';
 
CREATE OR REPLACE VIEW public.vw_documented_diagnostic_links AS
SELECT
  dl.id,
  dl.family_id,
  fs.symptom_code,
  fs.title AS symptom_title,
  fc.cause_code,
  fc.title AS cause_title,
  dt.test_code,
  dt.title AS test_title,
  dl.likelihood_rank,
  dl.documentary_confidence,
  dl.conditions_json,
  dl.recommended_first_checks_json
FROM public.diagnostic_links dl
JOIN public.fault_symptoms fs ON fs.id = dl.symptom_id
JOIN public.fault_causes fc ON fc.id = dl.cause_id
JOIN public.diagnostic_tests dt ON dt.id = dl.primary_test_id;
 
CREATE TRIGGER trg_machine_families_updated_at
BEFORE UPDATE ON public.machine_families
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_machines_updated_at
BEFORE UPDATE ON public.machines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_source_documents_updated_at
BEFORE UPDATE ON public.source_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_document_pages_updated_at
BEFORE UPDATE ON public.document_pages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_ingestion_runs_updated_at
BEFORE UPDATE ON public.ingestion_runs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_extraction_jobs_updated_at
BEFORE UPDATE ON public.extraction_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_subsystems_updated_at
BEFORE UPDATE ON public.subsystems
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_components_updated_at
BEFORE UPDATE ON public.components
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_assemblies_updated_at
BEFORE UPDATE ON public.assemblies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_parts_updated_at
BEFORE UPDATE ON public.parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_part_aliases_updated_at
BEFORE UPDATE ON public.part_aliases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_part_positions_updated_at
BEFORE UPDATE ON public.part_positions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_procedures_updated_at
BEFORE UPDATE ON public.procedures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_procedure_steps_updated_at
BEFORE UPDATE ON public.procedure_steps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_maintenance_tasks_updated_at
BEFORE UPDATE ON public.maintenance_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_maintenance_task_parts_updated_at
BEFORE UPDATE ON public.maintenance_task_parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_fault_symptoms_updated_at
BEFORE UPDATE ON public.fault_symptoms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_fault_causes_updated_at
BEFORE UPDATE ON public.fault_causes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_fault_cause_parts_updated_at
BEFORE UPDATE ON public.fault_cause_parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_fault_cause_procedures_updated_at
BEFORE UPDATE ON public.fault_cause_procedures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_diagnostic_tests_updated_at
BEFORE UPDATE ON public.diagnostic_tests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_diagnostic_test_steps_updated_at
BEFORE UPDATE ON public.diagnostic_test_steps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_diagnostic_links_updated_at
BEFORE UPDATE ON public.diagnostic_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_diagnostic_link_parts_updated_at
BEFORE UPDATE ON public.diagnostic_link_parts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_diagnostic_link_procedures_updated_at
BEFORE UPDATE ON public.diagnostic_link_procedures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_checklist_items_updated_at
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_report_template_sections_updated_at
BEFORE UPDATE ON public.report_template_sections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_log_signal_registry_updated_at
BEFORE UPDATE ON public.log_signal_registry
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_evidence_updated_at
BEFORE UPDATE ON public.evidence
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_data_quality_issues_updated_at
BEFORE UPDATE ON public.data_quality_issues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
CREATE TRIGGER trg_inference_policies_updated_at
BEFORE UPDATE ON public.inference_policies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
 
COMMIT;
