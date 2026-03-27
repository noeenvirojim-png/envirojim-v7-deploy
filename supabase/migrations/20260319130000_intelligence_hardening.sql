-- ============================================================================
-- ENVIROJIM V7 FULL MAX: ULTIMATE MACHINE PDF INTELLIGENCE HARDENING
-- ============================================================================

BEGIN;

-- 1. NEW ENUMS FOR SEPARATION
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_kb_lifecycle_status') THEN
        CREATE TYPE machine_kb_lifecycle_status AS ENUM ('draft', 'running', 'verifying', 'active', 'archived', 'failed');
    END IF;
END $$;

-- 2. UPDATE MACHINE_KB TABLE
-- Rename status to lifecycle_status and use the new enum
ALTER TABLE public.machine_kb RENAME COLUMN status TO legacy_status;
ALTER TABLE public.machine_kb ADD COLUMN lifecycle_status machine_kb_lifecycle_status NOT NULL DEFAULT 'draft';

-- Migrate existing statuses
UPDATE public.machine_kb SET lifecycle_status = 
    CASE 
        WHEN legacy_status::text = 'active' THEN 'active'::machine_kb_lifecycle_status
        WHEN legacy_status::text = 'running' THEN 'running'::machine_kb_lifecycle_status
        ELSE 'draft'::machine_kb_lifecycle_status
    END;

ALTER TABLE public.machine_kb DROP COLUMN legacy_status;

-- 3. HARDEN COUNTERS IN MACHINE_INGESTION_RUNS
-- Ensure columns exist and have proper defaults/checks
ALTER TABLE public.machine_ingestion_runs 
    ALTER COLUMN processed_documents SET DEFAULT 0,
    ALTER COLUMN successful_documents SET DEFAULT 0,
    ALTER COLUMN failed_documents SET DEFAULT 0;

-- 4. ATOMIC COUNTERS
CREATE OR REPLACE FUNCTION public.increment_ingestion_counter(r_id uuid, counter_name text) 
RETURNS void AS $$ 
BEGIN 
    IF counter_name = 'processed_documents' THEN
        UPDATE public.machine_ingestion_runs SET processed_documents = processed_documents + 1, updated_at = now() WHERE id = r_id;
    ELSIF counter_name = 'successful_documents' THEN
        UPDATE public.machine_ingestion_runs SET successful_documents = successful_documents + 1, updated_at = now() WHERE id = r_id;
    ELSIF counter_name = 'failed_documents' THEN
        UPDATE public.machine_ingestion_runs SET failed_documents = failed_documents + 1, updated_at = now() WHERE id = r_id;
    END IF;
END; 
$$ LANGUAGE plpgsql;

-- 5. REINFORCE CROSS-LINKS AND CONTRADICTIONS
-- Ensure cross-links have run_id for tracking
DO $$ BEGIN
  ALTER TABLE public.machine_kb_cross_links ADD COLUMN run_id uuid REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Ensure contradictions have run_id
DO $$ BEGIN
  ALTER TABLE public.machine_kb_contradictions ADD COLUMN run_id uuid REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Ensure ambiguities have run_id
DO $$ BEGIN
  ALTER TABLE public.machine_kb_ambiguities ADD COLUMN run_id uuid REFERENCES public.machine_ingestion_runs(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 5. MENTAL MAPS ENHANCEMENT
-- Add a field for the "Mental Map JSON" structure if not already generic
-- (Already exists as map_json)

COMMIT;
