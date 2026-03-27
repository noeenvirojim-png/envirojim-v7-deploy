BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1) ENUMS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_run_status') THEN
    CREATE TYPE public.ingestion_run_status AS ENUM (
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_phase') THEN
    CREATE TYPE public.ingestion_phase AS ENUM (
      'INIT',
      'INVENTORY',
      'CLASSIFY',
      'EXTRACT',
      'CONSOLIDATE',
      'GRAPH_BUILD',
      'QA_AUDIT',
      'GAP_REPAIR',
      'FINALIZE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_step_status') THEN
    CREATE TYPE public.ingestion_step_status AS ENUM (
      'pending',
      'running',
      'completed',
      'failed',
      'skipped',
      'needs_retry'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kb_entity_type') THEN
    CREATE TYPE public.kb_entity_type AS ENUM (
      'machine_identity',
      'system',
      'assembly',
      'part',
      'procedure',
      'maintenance_task',
      'fault_case',
      'warning',
      'technical_parameter',
      'electrical_component',
      'hydraulic_component',
      'connector',
      'terminal',
      'fluid',
      'operating_mode',
      'startup_sequence',
      'shutdown_sequence',
      'safety_device',
      'option',
      'document_section'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kb_status') THEN
    CREATE TYPE public.kb_status AS ENUM (
      'draft',
      'confirmed',
      'inferred',
      'ambiguous',
      'conflicting',
      'rejected',
      'superseded',
      'unreadable',
      'missing'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kb_confidence') THEN
    CREATE TYPE public.kb_confidence AS ENUM (
      'low',
      'medium',
      'high'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kb_criticality') THEN
    CREATE TYPE public.kb_criticality AS ENUM (
      'low',
      'medium',
      'high',
      'critical'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_kb_lifecycle_status') THEN
    CREATE TYPE public.machine_kb_lifecycle_status AS ENUM (
      'draft',
      'running',
      'verifying',
      'active',
      'archived',
      'failed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_graph_type') THEN
    CREATE TYPE public.machine_graph_type AS ENUM (
      'system',
      'causal',
      'electrical',
      'hydraulic'
    );
  END IF;
END $$;

-- ============================================================================
-- 2) GUARD: machine_documents must exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'machine_documents'
  ) THEN
    RAISE EXCEPTION 'MISSING_MACHINE_DOCUMENTS_TABLE';
  END IF;
END $$;

-- ============================================================================
-- 3) TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.machine_ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status public.ingestion_run_status NOT NULL DEFAULT 'pending',
  current_phase public.ingestion_phase NOT NULL DEFAULT 'INIT',
  total_documents integer NOT NULL DEFAULT 0,
  processed_documents integer NOT NULL DEFAULT 0,
  successful_documents integer NOT NULL DEFAULT 0,
  failed_documents integer NOT NULL DEFAULT 0,
  repair_pass_count integer NOT NULL DEFAULT 0,
  readiness_score integer NOT NULL DEFAULT 0,
  production_ready boolean NOT NULL DEFAULT false,
  evidence_id uuid NOT NULL DEFAULT gen_random_uuid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_ingestion_runs_total_documents_nonnegative CHECK (total_documents >= 0),
  CONSTRAINT machine_ingestion_runs_processed_documents_nonnegative CHECK (processed_documents >= 0),
  CONSTRAINT machine_ingestion_runs_successful_documents_nonnegative CHECK (successful_documents >= 0),
  CONSTRAINT machine_ingestion_runs_failed_documents_nonnegative CHECK (failed_documents >= 0),
  CONSTRAINT machine_ingestion_runs_repair_pass_count_nonnegative CHECK (repair_pass_count >= 0),
  CONSTRAINT machine_ingestion_runs_readiness_score_range CHECK (readiness_score >= 0 AND readiness_score <= 100),
  CONSTRAINT machine_ingestion_runs_processed_le_total CHECK (processed_documents <= total_documents),
  CONSTRAINT machine_ingestion_runs_success_failed_le_processed CHECK ((successful_documents + failed_documents) <= processed_documents)
);

CREATE TABLE IF NOT EXISTS public.machine_ingestion_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.machine_documents(id) ON DELETE CASCADE,
  phase public.ingestion_phase NOT NULL,
  step_name text NOT NULL,
  step_order integer NOT NULL,
  status public.ingestion_step_status NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_ingestion_steps_step_order_nonnegative CHECK (step_order >= 0),
  CONSTRAINT machine_ingestion_steps_duration_nonnegative CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE TABLE IF NOT EXISTS public.machine_ingestion_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.machine_documents(id) ON DELETE SET NULL,
  phase public.ingestion_phase NOT NULL,
  error_code text,
  error_message text NOT NULL,
  stack_trace text,
  error_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  retryable boolean NOT NULL DEFAULT true,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_document_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.machine_documents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  document_type text NOT NULL,
  document_type_confidence public.kb_confidence NOT NULL DEFAULT 'medium',
  language text NOT NULL DEFAULT 'unknown',
  title_detected text NOT NULL DEFAULT '',
  machine_reference_detected text NOT NULL DEFAULT '',
  serial_or_machine_no_detected text NOT NULL DEFAULT '',
  revision_or_date_detected text NOT NULL DEFAULT '',
  is_primary_for_machine_truth boolean NOT NULL DEFAULT false,
  is_reference_only boolean NOT NULL DEFAULT false,
  extraction_priority integer NOT NULL DEFAULT 999,
  notes text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_inventory_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_document_inventory_priority_nonnegative CHECK (extraction_priority >= 0),
  CONSTRAINT machine_document_inventory_document_unique UNIQUE (run_id, document_id)
);

CREATE TABLE IF NOT EXISTS public.machine_document_extracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.machine_documents(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  extraction_mode text NOT NULL DEFAULT 'full',
  document_type text NOT NULL,
  prompt_version text NOT NULL,
  gemini_model text NOT NULL,
  status public.ingestion_step_status NOT NULL DEFAULT 'pending',
  schema_valid boolean NOT NULL DEFAULT false,
  extraction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_document_extracts_version_positive CHECK (version >= 1),
  CONSTRAINT machine_document_extracts_unique_version UNIQUE (document_id, version)
);

CREATE TABLE IF NOT EXISTS public.machine_kb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status public.machine_kb_lifecycle_status NOT NULL DEFAULT 'draft',
  machine_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  coverage_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_score jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_kb_version_positive CHECK (version >= 1),
  CONSTRAINT machine_kb_unique_machine_version UNIQUE (machine_id, version)
);

CREATE TABLE IF NOT EXISTS public.machine_kb_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type public.kb_entity_type NOT NULL,
  canonical_name text NOT NULL,
  original_label text,
  aliases text[] NOT NULL DEFAULT '{}'::text[],
  language text NOT NULL DEFAULT 'unknown',
  confidence public.kb_confidence NOT NULL DEFAULT 'medium',
  status public.kb_status NOT NULL DEFAULT 'draft',
  criticality public.kb_criticality NOT NULL DEFAULT 'medium',
  source_document_id uuid REFERENCES public.machine_documents(id) ON DELETE SET NULL,
  source_file_name text NOT NULL DEFAULT '',
  source_page text NOT NULL DEFAULT '',
  section_title text NOT NULL DEFAULT '',
  evidence_snippet text NOT NULL DEFAULT '',
  evidence_hash text NOT NULL DEFAULT '',
  normalized_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_kb_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.machine_kb_entities(id) ON DELETE CASCADE,
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_document_id uuid REFERENCES public.machine_documents(id) ON DELETE SET NULL,
  source_file_name text NOT NULL,
  source_page text NOT NULL DEFAULT '',
  section_title text NOT NULL DEFAULT '',
  evidence_snippet text NOT NULL,
  language text NOT NULL DEFAULT 'unknown',
  confidence public.kb_confidence NOT NULL DEFAULT 'medium',
  raw_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_kb_graphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  graph_type public.machine_graph_type NOT NULL,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  graph_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_kb_graphs_unique_type UNIQUE (kb_id, graph_type)
);

CREATE TABLE IF NOT EXISTS public.machine_kb_cross_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_entity_id uuid REFERENCES public.machine_kb_entities(id) ON DELETE SET NULL,
  target_entity_id uuid REFERENCES public.machine_kb_entities(id) ON DELETE SET NULL,
  relation_type text NOT NULL,
  confidence public.kb_confidence NOT NULL DEFAULT 'medium',
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_kb_contradictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.machine_documents(id) ON DELETE SET NULL,
  description text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolution_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_kb_ambiguities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.machine_documents(id) ON DELETE SET NULL,
  description text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolution_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_qa_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  audit_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  verdict text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'unknown',
  production_ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.machine_mental_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL REFERENCES public.machine_kb(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE,
  map_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4) FUNCTIONS & TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ingestion_counter(
  p_run_id uuid,
  p_successful boolean,
  p_failed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.machine_ingestion_runs
  SET
    processed_documents = processed_documents + 1,
    successful_documents = successful_documents + CASE WHEN p_successful THEN 1 ELSE 0 END,
    failed_documents = failed_documents + CASE WHEN p_failed THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = p_run_id;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.table_name LIKE 'machine_%'
      AND c.column_name = 'updated_at'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_update_updated_at_%I ON public.%I', r.table_name, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER tr_update_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      r.table_name,
      r.table_name
    );
  END LOOP;
END $$;

-- ============================================================================
-- 5) RLS
-- ============================================================================

ALTER TABLE public.machine_ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_ingestion_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_ingestion_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_document_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_document_extracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb_cross_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb_contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_kb_ambiguities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_qa_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_mental_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machine_ingestion_runs_select_org ON public.machine_ingestion_runs;
CREATE POLICY machine_ingestion_runs_select_org
ON public.machine_ingestion_runs
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_ingestion_runs_all_org ON public.machine_ingestion_runs;
CREATE POLICY machine_ingestion_runs_all_org
ON public.machine_ingestion_runs
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_document_extracts_select_org ON public.machine_document_extracts;
CREATE POLICY machine_document_extracts_select_org
ON public.machine_document_extracts
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_document_extracts_all_org ON public.machine_document_extracts;
CREATE POLICY machine_document_extracts_all_org
ON public.machine_document_extracts
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_select_org ON public.machine_kb;
CREATE POLICY machine_kb_select_org
ON public.machine_kb
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_all_org ON public.machine_kb;
CREATE POLICY machine_kb_all_org
ON public.machine_kb
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_entities_select_org ON public.machine_kb_entities;
CREATE POLICY machine_kb_entities_select_org
ON public.machine_kb_entities
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_entities_all_org ON public.machine_kb_entities;
CREATE POLICY machine_kb_entities_all_org
ON public.machine_kb_entities
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_evidence_select_org ON public.machine_kb_evidence;
CREATE POLICY machine_kb_evidence_select_org
ON public.machine_kb_evidence
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_evidence_all_org ON public.machine_kb_evidence;
CREATE POLICY machine_kb_evidence_all_org
ON public.machine_kb_evidence
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_contradictions_select_org ON public.machine_kb_contradictions;
CREATE POLICY machine_kb_contradictions_select_org
ON public.machine_kb_contradictions
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_contradictions_all_org ON public.machine_kb_contradictions;
CREATE POLICY machine_kb_contradictions_all_org
ON public.machine_kb_contradictions
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_ambiguities_select_org ON public.machine_kb_ambiguities;
CREATE POLICY machine_kb_ambiguities_select_org
ON public.machine_kb_ambiguities
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_ambiguities_all_org ON public.machine_kb_ambiguities;
CREATE POLICY machine_kb_ambiguities_all_org
ON public.machine_kb_ambiguities
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_qa_audits_select_org ON public.machine_qa_audits;
CREATE POLICY machine_qa_audits_select_org
ON public.machine_qa_audits
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_qa_audits_all_org ON public.machine_qa_audits;
CREATE POLICY machine_qa_audits_all_org
ON public.machine_qa_audits
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_mental_maps_select_org ON public.machine_mental_maps;
CREATE POLICY machine_mental_maps_select_org
ON public.machine_mental_maps
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_mental_maps_all_org ON public.machine_mental_maps;
CREATE POLICY machine_mental_maps_all_org
ON public.machine_mental_maps
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_cross_links_select_org ON public.machine_kb_cross_links;
CREATE POLICY machine_kb_cross_links_select_org
ON public.machine_kb_cross_links
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_cross_links_all_org ON public.machine_kb_cross_links;
CREATE POLICY machine_kb_cross_links_all_org
ON public.machine_kb_cross_links
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_document_inventory_select_org ON public.machine_document_inventory;
CREATE POLICY machine_document_inventory_select_org
ON public.machine_document_inventory
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_document_inventory_all_org ON public.machine_document_inventory;
CREATE POLICY machine_document_inventory_all_org
ON public.machine_document_inventory
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_ingestion_steps_select_org ON public.machine_ingestion_steps;
CREATE POLICY machine_ingestion_steps_select_org
ON public.machine_ingestion_steps
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_ingestion_steps_all_org ON public.machine_ingestion_steps;
CREATE POLICY machine_ingestion_steps_all_org
ON public.machine_ingestion_steps
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_ingestion_errors_select_org ON public.machine_ingestion_errors;
CREATE POLICY machine_ingestion_errors_select_org
ON public.machine_ingestion_errors
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_ingestion_errors_all_org ON public.machine_ingestion_errors;
CREATE POLICY machine_ingestion_errors_all_org
ON public.machine_ingestion_errors
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_graphs_select_org ON public.machine_kb_graphs;
CREATE POLICY machine_kb_graphs_select_org
ON public.machine_kb_graphs
FOR SELECT
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS machine_kb_graphs_all_org ON public.machine_kb_graphs;
CREATE POLICY machine_kb_graphs_all_org
ON public.machine_kb_graphs
FOR ALL
TO authenticated
USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- ============================================================================
-- 6) INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_machine_ingestion_runs_machine_id ON public.machine_ingestion_runs(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_ingestion_runs_org_id ON public.machine_ingestion_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_machine_ingestion_runs_status_phase ON public.machine_ingestion_runs(status, current_phase);

CREATE INDEX IF NOT EXISTS idx_machine_ingestion_steps_run_id ON public.machine_ingestion_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_machine_ingestion_steps_doc_id ON public.machine_ingestion_steps(document_id);
CREATE INDEX IF NOT EXISTS idx_machine_ingestion_steps_org_id ON public.machine_ingestion_steps(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_ingestion_errors_run_id ON public.machine_ingestion_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_machine_ingestion_errors_org_id ON public.machine_ingestion_errors(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_document_inventory_run_id ON public.machine_document_inventory(run_id);
CREATE INDEX IF NOT EXISTS idx_machine_document_inventory_document_id ON public.machine_document_inventory(document_id);
CREATE INDEX IF NOT EXISTS idx_machine_document_inventory_org_id ON public.machine_document_inventory(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_document_extract_run_id ON public.machine_document_extracts(run_id);
CREATE INDEX IF NOT EXISTS idx_machine_document_extract_document_id ON public.machine_document_extracts(document_id);
CREATE INDEX IF NOT EXISTS idx_machine_document_extract_org_id ON public.machine_document_extracts(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_machine_status ON public.machine_kb(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_machine_kb_org_id ON public.machine_kb(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_entities_kb_id ON public.machine_kb_entities(kb_id);
CREATE INDEX IF NOT EXISTS idx_machine_kb_entities_entity_type ON public.machine_kb_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_machine_kb_entities_org_id ON public.machine_kb_entities(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_evidence_entity_id ON public.machine_kb_evidence(entity_id);
CREATE INDEX IF NOT EXISTS idx_machine_kb_evidence_org_id ON public.machine_kb_evidence(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_graphs_kb_id ON public.machine_kb_graphs(kb_id);
CREATE INDEX IF NOT EXISTS idx_machine_kb_graphs_org_id ON public.machine_kb_graphs(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_cross_links_kb_id ON public.machine_kb_cross_links(kb_id);
CREATE INDEX IF NOT EXISTS idx_machine_kb_cross_links_org_id ON public.machine_kb_cross_links(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_contradictions_kb_id ON public.machine_kb_contradictions(kb_id);
CREATE INDEX IF NOT EXISTS idx_machine_kb_contradictions_org_id ON public.machine_kb_contradictions(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_kb_ambiguities_kb_id ON public.machine_kb_ambiguities(kb_id);
CREATE INDEX IF NOT EXISTS idx_machine_kb_ambiguities_org_id ON public.machine_kb_ambiguities(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_qa_audits_run_id ON public.machine_qa_audits(run_id);
CREATE INDEX IF NOT EXISTS idx_machine_qa_audits_org_id ON public.machine_qa_audits(organization_id);

CREATE INDEX IF NOT EXISTS idx_machine_mental_maps_run_id ON public.machine_mental_maps(run_id);
CREATE INDEX IF NOT EXISTS idx_machine_mental_maps_org_id ON public.machine_mental_maps(organization_id);

COMMIT;
