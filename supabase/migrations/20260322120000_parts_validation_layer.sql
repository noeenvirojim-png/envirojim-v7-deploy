BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.machine_part_validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  ingestion_run_id uuid NULL,
  source_document_id uuid NULL,
  status text NOT NULL DEFAULT 'running',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_part_validation_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_machine_part_validation_runs_machine
  ON public.machine_part_validation_runs(machine_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.machine_part_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id uuid NOT NULL REFERENCES public.machine_part_validation_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  source_part_id uuid NULL,
  source_kb_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_label text NOT NULL DEFAULT '',
  normalized_label text NOT NULL DEFAULT '',
  raw_part_number text NOT NULL DEFAULT '',
  normalized_part_number text NOT NULL DEFAULT '',
  source_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_source_page text NOT NULL DEFAULT '',
  section_titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_snippets jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_count integer NOT NULL DEFAULT 0,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_status text NOT NULL DEFAULT 'needs_review',
  review_reason text NOT NULL DEFAULT '',
  duplicate_group_key text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_part_candidates_status_check
    CHECK (validation_status IN ('validated', 'needs_review', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_machine_part_candidates_run
  ON public.machine_part_candidates(validation_run_id, validation_status);

CREATE INDEX IF NOT EXISTS idx_machine_part_candidates_machine
  ON public.machine_part_candidates(machine_id, normalized_part_number, normalized_label);

CREATE TABLE IF NOT EXISTS public.machine_part_page_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id uuid NOT NULL REFERENCES public.machine_part_validation_runs(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  page_number text NOT NULL,
  chunk_count integer NOT NULL DEFAULT 0,
  part_signal_score integer NOT NULL DEFAULT 0,
  candidate_count integer NOT NULL DEFAULT 0,
  validated_candidate_count integer NOT NULL DEFAULT 0,
  coverage_status text NOT NULL DEFAULT 'unknown',
  sample_snippet text NOT NULL DEFAULT '',
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_part_page_coverage_status_check
    CHECK (coverage_status IN ('covered', 'needs_review', 'no_part_expected', 'unknown')),
  CONSTRAINT machine_part_page_coverage_unique_run_page
    UNIQUE (validation_run_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_machine_part_page_coverage_run
  ON public.machine_part_page_coverage(validation_run_id, coverage_status);

CREATE OR REPLACE VIEW public.v_machine_part_review_queue AS
SELECT
  c.validation_run_id,
  c.machine_id,
  c.organization_id,
  c.source_part_id,
  c.raw_label,
  c.raw_part_number,
  c.primary_source_page,
  c.evidence_count,
  c.flags,
  c.review_reason,
  c.created_at
FROM public.machine_part_candidates c
WHERE c.validation_status <> 'validated'
ORDER BY c.primary_source_page, c.raw_part_number, c.raw_label;

CREATE OR REPLACE VIEW public.v_machine_part_validation_summary AS
SELECT
  r.id AS validation_run_id,
  r.machine_id,
  r.organization_id,
  r.status,
  COALESCE((r.summary->>'total_parts')::integer, 0) AS total_parts,
  COALESCE((r.summary->>'validated_parts')::integer, 0) AS validated_parts,
  COALESCE((r.summary->>'needs_review_parts')::integer, 0) AS needs_review_parts,
  COALESCE((r.summary->>'pages_total')::integer, 0) AS pages_total,
  COALESCE((r.summary->>'pages_needing_review')::integer, 0) AS pages_needing_review,
  r.started_at,
  r.completed_at
FROM public.machine_part_validation_runs r
ORDER BY r.started_at DESC;

COMMIT;
