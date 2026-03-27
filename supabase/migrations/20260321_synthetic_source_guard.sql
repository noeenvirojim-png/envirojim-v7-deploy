-- ENVIROJIM — Synthetic source guard
-- Adds is_synthetic flag to source_documents.
-- A synthetic source NEVER produces official evidence, confirmed parts, or safe_to_order.

BEGIN;

ALTER TABLE public.source_documents
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.source_documents.is_synthetic IS
  'true = bootstrap/synthetic placeholder — cannot confirm parts, cannot be official evidence, cannot produce safe_to_order';

-- Partial index: official-only docs (what queries should use)
CREATE INDEX IF NOT EXISTS idx_source_documents_real
  ON public.source_documents (family_id, doc_type)
  WHERE is_synthetic = false;

-- Guard view: parts that have official evidence from real (non-synthetic) documents only
CREATE OR REPLACE VIEW public.vw_official_confirmed_parts AS
SELECT p.*
FROM public.parts p
JOIN public.source_documents sd ON sd.id = p.official_source_document_id
WHERE p.validation_status = 'official_confirmed'
  AND p.official_source_document_id IS NOT NULL
  AND p.official_source_page IS NOT NULL
  AND btrim(p.official_source_snippet) <> ''
  AND sd.is_synthetic = false;

-- Guard view: evidence from real documents only
CREATE OR REPLACE VIEW public.vw_official_evidence AS
SELECT e.*
FROM public.evidence e
JOIN public.source_documents sd ON sd.id = e.source_document_id
WHERE sd.is_synthetic = false;

COMMIT;
