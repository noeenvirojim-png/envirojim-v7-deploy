BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ai_semantic_validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_delivery_run_id text NOT NULL,
  machine_id text,
  kb_id text,
  maintenance_total integer NOT NULL DEFAULT 0,
  diagnostic_total integer NOT NULL DEFAULT 0,
  maintenance_keep_count integer NOT NULL DEFAULT 0,
  maintenance_needs_review_count integer NOT NULL DEFAULT 0,
  maintenance_reject_count integer NOT NULL DEFAULT 0,
  diagnostic_keep_count integer NOT NULL DEFAULT 0,
  diagnostic_needs_review_count integer NOT NULL DEFAULT 0,
  diagnostic_reject_count integer NOT NULL DEFAULT 0,
  evidence_attached_total integer NOT NULL DEFAULT 0,
  weak_anchor_total integer NOT NULL DEFAULT 0,
  export_dir text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_validation_runs_ai_delivery_run_id
  ON public.ai_semantic_validation_runs (ai_delivery_run_id);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_validation_runs_created_at
  ON public.ai_semantic_validation_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_semantic_validation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_run_id uuid NOT NULL REFERENCES public.ai_semantic_validation_runs(id) ON DELETE CASCADE,
  item_kind text NOT NULL,
  source_table text NOT NULL,
  source_row_id text,
  source_entity_id text,
  title text,
  normalized_title text,
  entity_type text,
  evidence_page integer,
  evidence_snippet text,
  anchor_strength text NOT NULL DEFAULT 'NONE',
  semantic_status text NOT NULL,
  semantic_reason text NOT NULL,
  review_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_validation_items_run_id
  ON public.ai_semantic_validation_items (validation_run_id);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_validation_items_kind_status
  ON public.ai_semantic_validation_items (item_kind, semantic_status);

CREATE INDEX IF NOT EXISTS idx_ai_semantic_validation_items_source_entity_id
  ON public.ai_semantic_validation_items (source_entity_id);

COMMIT;
