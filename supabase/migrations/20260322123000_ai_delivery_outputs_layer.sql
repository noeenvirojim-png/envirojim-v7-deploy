BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ai_delivery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id uuid NOT NULL,
  machine_id uuid NULL,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'completed', 'failed')),
  total_items integer NOT NULL DEFAULT 0,
  ready_items integer NOT NULL DEFAULT 0,
  needs_review_items integer NOT NULL DEFAULT 0,
  maintenance_items integer NOT NULL DEFAULT 0,
  checklist_items integer NOT NULL DEFAULT 0,
  diagnostic_items integer NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_delivery_runs_kb_id
  ON public.ai_delivery_runs (kb_id);

CREATE INDEX IF NOT EXISTS idx_ai_delivery_runs_created_at
  ON public.ai_delivery_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ai_delivery_runs(id) ON DELETE CASCADE,
  kb_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  delivery_kind text NOT NULL CHECK (delivery_kind IN ('maintenance', 'checklist', 'diagnostic')),
  title text NOT NULL,
  entity_type text NULL,
  source_page text NULL,
  evidence_snippet text NULL,
  status text NOT NULL CHECK (status IN ('ready', 'needs_review')),
  review_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, entity_id, delivery_kind)
);

CREATE INDEX IF NOT EXISTS idx_ai_delivery_items_run_id
  ON public.ai_delivery_items (run_id);

CREATE INDEX IF NOT EXISTS idx_ai_delivery_items_kb_id
  ON public.ai_delivery_items (kb_id);

CREATE INDEX IF NOT EXISTS idx_ai_delivery_items_kind
  ON public.ai_delivery_items (delivery_kind);

CREATE INDEX IF NOT EXISTS idx_ai_delivery_items_status
  ON public.ai_delivery_items (status);

CREATE OR REPLACE VIEW public.ai_delivery_review_queue AS
SELECT
  i.run_id,
  i.kb_id,
  i.entity_id,
  i.delivery_kind,
  i.title,
  i.entity_type,
  i.source_page,
  i.evidence_snippet,
  i.status,
  i.review_reason,
  i.created_at
FROM public.ai_delivery_items i
WHERE i.status = 'needs_review';

CREATE OR REPLACE VIEW public.ai_delivery_latest_run_summary AS
SELECT
  r.id AS run_id,
  r.kb_id,
  r.machine_id,
  r.status,
  r.total_items,
  r.ready_items,
  r.needs_review_items,
  r.maintenance_items,
  r.checklist_items,
  r.diagnostic_items,
  r.notes,
  r.created_at,
  r.completed_at
FROM public.ai_delivery_runs r
WHERE r.created_at = (
  SELECT MAX(r2.created_at)
  FROM public.ai_delivery_runs r2
  WHERE r2.kb_id = r.kb_id
);

COMMIT;
