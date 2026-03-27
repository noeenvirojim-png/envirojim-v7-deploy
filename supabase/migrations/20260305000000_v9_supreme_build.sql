-- ============================================================================
-- ENVIROJIM V9 SUPREME BUILD
-- CLEAN MASTER SCHEMA + SECURITY + MULTI-TENANCY + MACHINE-AI CORE
-- HARDENED VERSION: SECURITY DEFINER + SEARCH_PATH
-- ============================================================================

BEGIN;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE public.organization_type AS ENUM ('PLATFORM', 'DEALER', 'SERVICE_PROVIDER', 'CLIENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'SUPER_ADMIN', 'ENVIROJIM_ADMIN', 'DEALER_ADMIN', 'SERVICE_PROVIDER_ADMIN', 'CLIENT_ADMIN', 'TECHNICIAN', 'OPERATOR', 'CLIENT_USER',
    'platform_admin', 'org_admin', 'manager', 'technician', 'client_user', 'procurement_user'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.machine_lifecycle_type AS ENUM ('owned', 'leased', 'rental', 'demo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.machine_status_internal AS ENUM ('active', 'decommissioned', 'archived', 'pending_onboarding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.machine_status_client AS ENUM ('healthy', 'needs_attention', 'maintenance_priority', 'down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('manual', 'schematic', 'service_bulletin', 'parts_catalog', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.processing_status AS ENUM ('uploaded', 'queued', 'parsing', 'extracting', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chunk_type AS ENUM ('text', 'table', 'image_description', 'metadata');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.severity_level AS ENUM ('low', 'normal', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.procedure_category AS ENUM ('inspection', 'preventive', 'corrective', 'calibration', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.maintenance_interval_type AS ENUM ('hours', 'days', 'months', 'conditional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.work_order_status AS ENUM ('draft', 'scheduled', 'in_progress', 'paused', 'completed', 'cancelled', 'OPEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.work_order_priority AS ENUM ('low', 'normal', 'high', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.part_order_status AS ENUM ('draft', 'pending_approval', 'ordered', 'partially_received', 'received', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLES

-- 3.1 ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type organization_type NOT NULL DEFAULT 'CLIENT',
  primary_domain text UNIQUE,
  allowed_domains text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_name_not_blank CHECK (btrim(name) <> '')
);

-- 3.2 USERS
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  role user_role NOT NULL DEFAULT 'client_user',
  email text NOT NULL UNIQUE,
  full_name text,
  auth_provider text,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (btrim(email) <> '')
);

-- 3.3 INVITATIONS
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'client_user',
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_constraint text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_email_not_blank CHECK (btrim(email) <> ''),
  CONSTRAINT invitations_unique_org_email UNIQUE (org_id, email),
  CONSTRAINT invitations_token_unique UNIQUE (token)
);

-- 3.4 MACHINES
CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  owner_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  operator_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  dealer_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  assigned_tech_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  lifecycle_type machine_lifecycle_type NOT NULL DEFAULT 'owned',
  manufacturer text,
  brand text,
  family text,
  model text,
  variant text,
  serial_number text NOT NULL,
  year integer,
  nickname text,
  internal_reference text,
  status_internal machine_status_internal NOT NULL DEFAULT 'active',
  status_client_facing machine_status_client NOT NULL DEFAULT 'maintenance_priority',
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machines_serial_not_blank CHECK (btrim(serial_number) <> ''),
  CONSTRAINT machines_year_valid CHECK (year IS NULL OR (year >= 1900 AND year <= 2100)),
  CONSTRAINT machines_unique_org_serial UNIQUE (organization_id, serial_number)
);

-- 3.5 MACHINE DOCUMENTS
CREATE TABLE IF NOT EXISTS public.machine_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  document_type document_type NOT NULL DEFAULT 'other',
  language text NOT NULL DEFAULT 'en',
  revision text,
  source_hash text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processing_status processing_status NOT NULL DEFAULT 'uploaded',
  parse_version text,
  extraction_version text,
  extracted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT machine_documents_storage_path_not_blank CHECK (btrim(storage_path) <> ''),
  CONSTRAINT machine_documents_filename_not_blank CHECK (btrim(filename) <> '')
);

-- 3.6 DOCUMENT CHUNKS
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.machine_documents(id) ON DELETE CASCADE,
  chunk_type chunk_type NOT NULL,
  raw_text text,
  normalized_text text,
  page_from integer,
  page_to integer,
  section_title text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_chunks_page_range_valid CHECK (
    (page_from IS NULL AND page_to IS NULL)
    OR (page_from IS NOT NULL AND page_to IS NOT NULL AND page_from <= page_to AND page_from > 0)
  )
);

-- 3.7 PARTS
CREATE TABLE IF NOT EXISTS public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  canonical_part_number text NOT NULL,
  raw_part_number text,
  name text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  function text,
  category text,
  assembly text,
  subassembly text,
  compatible_variants text[] NOT NULL DEFAULT '{}',
  criticality severity_level NOT NULL DEFAULT 'normal',
  consumable boolean NOT NULL DEFAULT false,
  maintenance_related boolean NOT NULL DEFAULT false,
  source_confidence double precision NOT NULL DEFAULT 0,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parts_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT parts_canonical_not_blank CHECK (btrim(canonical_part_number) <> ''),
  CONSTRAINT parts_confidence_valid CHECK (source_confidence >= 0 AND source_confidence <= 1),
  CONSTRAINT parts_unique_machine_part UNIQUE (machine_id, canonical_part_number)
);

-- 3.8 PROCEDURES
CREATE TABLE IF NOT EXISTS public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  title text NOT NULL,
  category procedure_category NOT NULL,
  preconditions text,
  tools_required text[] NOT NULL DEFAULT '{}',
  parts_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordered_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings text[] NOT NULL DEFAULT '{}',
  estimated_duration text,
  source_confidence double precision NOT NULL DEFAULT 0,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT procedures_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT procedures_confidence_valid CHECK (source_confidence >= 0 AND source_confidence <= 1)
);

-- 3.9 FAULT PATTERNS
CREATE TABLE IF NOT EXISTS public.fault_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  symptom text NOT NULL,
  probable_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  diagnostic_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  corrective_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity_internal severity_level NOT NULL DEFAULT 'normal',
  client_wording text NOT NULL DEFAULT 'Recommended Service',
  source_confidence double precision NOT NULL DEFAULT 0,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fault_patterns_symptom_not_blank CHECK (btrim(symptom) <> ''),
  CONSTRAINT fault_patterns_confidence_valid CHECK (source_confidence >= 0 AND source_confidence <= 1)
);

-- 3.10 MAINTENANCE PLAN ITEMS
CREATE TABLE IF NOT EXISTS public.maintenance_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  interval_type maintenance_interval_type NOT NULL,
  interval_value integer,
  title text NOT NULL,
  description text,
  required_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_confidence double precision NOT NULL DEFAULT 0,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_plan_items_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT maintenance_plan_items_interval_valid CHECK (
    (interval_type = 'conditional')
    OR (interval_value IS NOT NULL AND interval_value > 0)
  ),
  CONSTRAINT maintenance_plan_items_confidence_valid CHECK (source_confidence >= 0 AND source_confidence <= 1)
);

-- 3.11 DIAGNOSTIC SESSIONS
CREATE TABLE IF NOT EXISTS public.diagnostic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  symptoms_input jsonb NOT NULL DEFAULT '[]'::jsonb,
  machine_context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_procedures jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diagnostic_sessions_confidence_valid CHECK (confidence >= 0 AND confidence <= 1)
);

-- 3.12 WORK ORDERS
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority work_order_priority NOT NULL DEFAULT 'normal',
  status work_order_status NOT NULL DEFAULT 'scheduled',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_diagnostic_id uuid REFERENCES public.diagnostic_sessions(id) ON DELETE SET NULL,
  related_parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_orders_title_not_blank CHECK (btrim(title) <> ''),
  CONSTRAINT work_orders_schedule_valid CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end >= scheduled_start)
);

-- 3.13 PART ORDERS
CREATE TABLE IF NOT EXISTS public.part_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  supplier text,
  status part_order_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'CAD',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT part_orders_currency_not_blank CHECK (btrim(currency) <> ''),
  CONSTRAINT part_orders_amounts_non_negative CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0)
);

-- 3.14 PART ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.part_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_order_id uuid NOT NULL REFERENCES public.part_orders(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  part_number text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  linked_work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  linked_diagnostic_id uuid REFERENCES public.diagnostic_sessions(id) ON DELETE SET NULL,
  urgency severity_level NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT part_order_items_part_number_not_blank CHECK (btrim(part_number) <> ''),
  CONSTRAINT part_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT part_order_items_unit_price_non_negative CHECK (unit_price >= 0)
);

-- 3.15 ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_logs_entity_type_not_blank CHECK (btrim(entity_type) <> ''),
  CONSTRAINT activity_logs_action_not_blank CHECK (btrim(action) <> '')
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_org ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

CREATE INDEX IF NOT EXISTS idx_machines_org ON public.machines(organization_id);
CREATE INDEX IF NOT EXISTS idx_machines_owner_org ON public.machines(owner_org_id);
CREATE INDEX IF NOT EXISTS idx_machines_operator_org ON public.machines(operator_org_id);
CREATE INDEX IF NOT EXISTS idx_machines_dealer_org ON public.machines(dealer_org_id);
CREATE INDEX IF NOT EXISTS idx_machines_assigned_tech_org ON public.machines(assigned_tech_org_id);
CREATE INDEX IF NOT EXISTS idx_machines_serial ON public.machines(serial_number);
CREATE INDEX IF NOT EXISTS idx_machines_model ON public.machines(model);

CREATE INDEX IF NOT EXISTS idx_machine_documents_machine ON public.machine_documents(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_documents_status ON public.machine_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_machine_documents_type ON public.machine_documents(document_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_documents_machine_source_hash_unique
  ON public.machine_documents(machine_id, source_hash)
  WHERE source_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_machine ON public.document_chunks(machine_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_type ON public.document_chunks(chunk_type);

CREATE INDEX IF NOT EXISTS idx_parts_machine ON public.parts(machine_id);
CREATE INDEX IF NOT EXISTS idx_parts_canonical_part_number ON public.parts(canonical_part_number);
CREATE INDEX IF NOT EXISTS idx_parts_name ON public.parts(name);

CREATE INDEX IF NOT EXISTS idx_procedures_machine ON public.procedures(machine_id);
CREATE INDEX IF NOT EXISTS idx_procedures_category ON public.procedures(category);

CREATE INDEX IF NOT EXISTS idx_fault_patterns_machine ON public.fault_patterns(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_plan_items_machine ON public.maintenance_plan_items(machine_id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_machine ON public.diagnostic_sessions(machine_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_org ON public.diagnostic_sessions(organization_id);

CREATE INDEX IF NOT EXISTS idx_work_orders_org ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_machine ON public.work_orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON public.work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);

CREATE INDEX IF NOT EXISTS idx_part_orders_org ON public.part_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_machine ON public.part_orders(machine_id);
CREATE INDEX IF NOT EXISTS idx_part_orders_status ON public.part_orders(status);

CREATE INDEX IF NOT EXISTS idx_part_order_items_order ON public.part_order_items(part_order_id);
CREATE INDEX IF NOT EXISTS idx_part_order_items_part_number ON public.part_order_items(part_number);

CREATE INDEX IF NOT EXISTS idx_activity_logs_org ON public.activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_machine ON public.activity_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- 5. FUNCTIONS

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_profile_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT organization_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(public.current_user_role() = 'platform_admin', false)
$$;

CREATE OR REPLACE FUNCTION public.same_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    public.is_platform_admin()
    OR public.current_user_profile_org_id() = target_org_id,
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    public.is_platform_admin()
    OR (
      public.current_user_profile_org_id() = target_org_id
      AND public.current_user_role() IN ('org_admin', 'manager')
    ),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_procurement(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    public.is_platform_admin()
    OR (
      public.current_user_profile_org_id() = target_org_id
      AND public.current_user_role() IN ('org_admin', 'manager', 'procurement_user')
    ),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_work_orders(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    public.is_platform_admin()
    OR (
      public.current_user_profile_org_id() = target_org_id
      AND public.current_user_role() IN ('org_admin', 'manager', 'technician')
    ),
    false
  )
$$;

CREATE OR REPLACE FUNCTION public.machine_visible_to_current_user(target_machine_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.machines m
    WHERE m.id = target_machine_id
      AND (
        public.is_platform_admin()
        OR m.organization_id = public.current_user_profile_org_id()
        OR m.owner_org_id = public.current_user_profile_org_id()
        OR m.operator_org_id = public.current_user_profile_org_id()
        OR m.dealer_org_id = public.current_user_profile_org_id()
        OR m.assigned_tech_org_id = public.current_user_profile_org_id()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.machine_org_for_current_user(target_machine_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT m.organization_id
  FROM public.machines m
  WHERE m.id = target_machine_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.ensure_machine_document_machine_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  doc_machine_id uuid;
BEGIN
  SELECT machine_id
  INTO doc_machine_id
  FROM public.machine_documents
  WHERE id = NEW.document_id;

  IF doc_machine_id IS NULL THEN
    RAISE EXCEPTION 'document_id % not found', NEW.document_id;
  END IF;

  IF NEW.machine_id <> doc_machine_id THEN
    RAISE EXCEPTION 'document_chunks.machine_id must match machine_documents.machine_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_work_order_machine_org_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  machine_org uuid;
BEGIN
  SELECT organization_id
  INTO machine_org
  FROM public.machines
  WHERE id = NEW.machine_id;

  IF machine_org IS NULL THEN
    RAISE EXCEPTION 'machine_id % not found', NEW.machine_id;
  END IF;

  IF NEW.organization_id <> machine_org THEN
    RAISE EXCEPTION 'work_orders.organization_id must match machines.organization_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_diagnostic_machine_org_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  machine_org uuid;
BEGIN
  SELECT organization_id
  INTO machine_org
  FROM public.machines
  WHERE id = NEW.machine_id;

  IF machine_org IS NULL THEN
    RAISE EXCEPTION 'machine_id % not found', NEW.machine_id;
  END IF;

  IF NEW.organization_id <> machine_org THEN
    RAISE EXCEPTION 'diagnostic_sessions.organization_id must match machines.organization_id';
  END IF;

  RETURN NEW;
END;
$$;

-- 6. TRIGGERS
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invitations_updated_at ON public.invitations;
CREATE TRIGGER trg_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_machines_updated_at ON public.machines;
CREATE TRIGGER trg_machines_updated_at
BEFORE UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_machine_documents_updated_at ON public.machine_documents;
CREATE TRIGGER trg_machine_documents_updated_at
BEFORE UPDATE ON public.machine_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_document_chunks_updated_at ON public.document_chunks;
CREATE TRIGGER trg_document_chunks_updated_at
BEFORE UPDATE ON public.document_chunks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_parts_updated_at ON public.parts;
CREATE TRIGGER trg_parts_updated_at
BEFORE UPDATE ON public.parts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_procedures_updated_at ON public.procedures;
CREATE TRIGGER trg_procedures_updated_at
BEFORE UPDATE ON public.procedures
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fault_patterns_updated_at ON public.fault_patterns;
CREATE TRIGGER trg_fault_patterns_updated_at
BEFORE UPDATE ON public.fault_patterns
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_plan_items_updated_at ON public.maintenance_plan_items;
CREATE TRIGGER trg_maintenance_plan_items_updated_at
BEFORE UPDATE ON public.maintenance_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_diagnostic_sessions_updated_at ON public.diagnostic_sessions;
CREATE TRIGGER trg_diagnostic_sessions_updated_at
BEFORE UPDATE ON public.diagnostic_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER trg_work_orders_updated_at
BEFORE UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_part_orders_updated_at ON public.part_orders;
CREATE TRIGGER trg_part_orders_updated_at
BEFORE UPDATE ON public.part_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_part_order_items_updated_at ON public.part_order_items;
CREATE TRIGGER trg_part_order_items_updated_at
BEFORE UPDATE ON public.part_order_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_document_chunks_machine_match ON public.document_chunks;
CREATE TRIGGER trg_document_chunks_machine_match
BEFORE INSERT OR UPDATE ON public.document_chunks
FOR EACH ROW
EXECUTE FUNCTION public.ensure_machine_document_machine_match();

DROP TRIGGER IF EXISTS trg_work_orders_machine_org_match ON public.work_orders;
CREATE TRIGGER trg_work_orders_machine_org_match
BEFORE INSERT OR UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_work_order_machine_org_match();

DROP TRIGGER IF EXISTS trg_diagnostic_machine_org_match ON public.diagnostic_sessions;
CREATE TRIGGER trg_diagnostic_machine_org_match
BEFORE INSERT OR UPDATE ON public.diagnostic_sessions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_diagnostic_machine_org_match();

-- 7. RLS ENABLE
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- ORGANIZATIONS
DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select
ON public.organizations
FOR SELECT
USING (public.same_org(id));

DROP POLICY IF EXISTS organizations_update ON public.organizations;
CREATE POLICY organizations_update
ON public.organizations
FOR UPDATE
USING (public.can_manage_org(id))
WITH CHECK (public.can_manage_org(id));

-- USERS
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select
ON public.users
FOR SELECT
USING (
  auth.uid() = id
  OR public.same_org(organization_id)
);

DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert
ON public.users
FOR INSERT
WITH CHECK (
  auth.uid() = id
  OR public.can_manage_org(organization_id)
);

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update
ON public.users
FOR UPDATE
USING (
  auth.uid() = id
  OR public.can_manage_org(organization_id)
)
WITH CHECK (
  auth.uid() = id
  OR public.can_manage_org(organization_id)
);

-- INVITATIONS
DROP POLICY IF EXISTS invitations_select ON public.invitations;
CREATE POLICY invitations_select
ON public.invitations
FOR SELECT
USING (
  public.can_manage_org(org_id)
  OR lower(email) = lower(auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS invitations_insert ON public.invitations;
CREATE POLICY invitations_insert
ON public.invitations
FOR INSERT
WITH CHECK (public.can_manage_org(org_id));

DROP POLICY IF EXISTS invitations_update ON public.invitations;
CREATE POLICY invitations_update
ON public.invitations
FOR UPDATE
USING (
  public.can_manage_org(org_id)
  OR lower(email) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
  public.can_manage_org(org_id)
  OR lower(email) = lower(auth.jwt() ->> 'email')
);

DROP POLICY IF EXISTS invitations_delete ON public.invitations;
CREATE POLICY invitations_delete
ON public.invitations
FOR DELETE
USING (public.can_manage_org(org_id));

-- MACHINES
DROP POLICY IF EXISTS machines_select ON public.machines;
CREATE POLICY machines_select
ON public.machines
FOR SELECT
USING (
  public.is_platform_admin()
  OR organization_id = public.current_user_profile_org_id()
  OR owner_org_id = public.current_user_profile_org_id()
  OR operator_org_id = public.current_user_profile_org_id()
  OR dealer_org_id = public.current_user_profile_org_id()
  OR assigned_tech_org_id = public.current_user_profile_org_id()
);

DROP POLICY IF EXISTS machines_insert ON public.machines;
CREATE POLICY machines_insert
ON public.machines
FOR INSERT
WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS machines_update ON public.machines;
CREATE POLICY machines_update
ON public.machines
FOR UPDATE
USING (public.can_manage_org(organization_id))
WITH CHECK (public.can_manage_org(organization_id));

DROP POLICY IF EXISTS machines_delete ON public.machines;
CREATE POLICY machines_delete
ON public.machines
FOR DELETE
USING (public.can_manage_org(organization_id));

-- MACHINE DOCUMENTS
DROP POLICY IF EXISTS machine_documents_select ON public.machine_documents;
CREATE POLICY machine_documents_select
ON public.machine_documents
FOR SELECT
USING (public.machine_visible_to_current_user(machine_id));

DROP POLICY IF EXISTS machine_documents_insert ON public.machine_documents;
CREATE POLICY machine_documents_insert
ON public.machine_documents
FOR INSERT
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS machine_documents_update ON public.machine_documents;
CREATE POLICY machine_documents_update
ON public.machine_documents
FOR UPDATE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
)
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS machine_documents_delete ON public.machine_documents;
CREATE POLICY machine_documents_delete
ON public.machine_documents
FOR DELETE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

-- DOCUMENT CHUNKS
DROP POLICY IF EXISTS document_chunks_select ON public.document_chunks;
CREATE POLICY document_chunks_select
ON public.document_chunks
FOR SELECT
USING (public.machine_visible_to_current_user(machine_id));

DROP POLICY IF EXISTS document_chunks_insert ON public.document_chunks;
CREATE POLICY document_chunks_insert
ON public.document_chunks
FOR INSERT
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS document_chunks_update ON public.document_chunks;
CREATE POLICY document_chunks_update
ON public.document_chunks
FOR UPDATE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
)
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS document_chunks_delete ON public.document_chunks;
CREATE POLICY document_chunks_delete
ON public.document_chunks
FOR DELETE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

-- PARTS
DROP POLICY IF EXISTS parts_select ON public.parts;
CREATE POLICY parts_select
ON public.parts
FOR SELECT
USING (public.machine_visible_to_current_user(machine_id));

DROP POLICY IF EXISTS parts_insert ON public.parts;
CREATE POLICY parts_insert
ON public.parts
FOR INSERT
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS parts_update ON public.parts;
CREATE POLICY parts_update
ON public.parts
FOR UPDATE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
)
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS parts_delete ON public.parts;
CREATE POLICY parts_delete
ON public.parts
FOR DELETE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

-- PROCEDURES
DROP POLICY IF EXISTS procedures_select ON public.procedures;
CREATE POLICY procedures_select
ON public.procedures
FOR SELECT
USING (public.machine_visible_to_current_user(machine_id));

DROP POLICY IF EXISTS procedures_insert ON public.procedures;
CREATE POLICY procedures_insert
ON public.procedures
FOR INSERT
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS procedures_update ON public.procedures;
CREATE POLICY procedures_update
ON public.procedures
FOR UPDATE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
)
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS procedures_delete ON public.procedures;
CREATE POLICY procedures_delete
ON public.procedures
FOR DELETE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

-- FAULT PATTERNS
DROP POLICY IF EXISTS fault_patterns_select ON public.fault_patterns;
CREATE POLICY fault_patterns_select
ON public.fault_patterns
FOR SELECT
USING (public.machine_visible_to_current_user(machine_id));

DROP POLICY IF EXISTS fault_patterns_insert ON public.fault_patterns;
CREATE POLICY fault_patterns_insert
ON public.fault_patterns
FOR INSERT
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS fault_patterns_update ON public.fault_patterns;
CREATE POLICY fault_patterns_update
ON public.fault_patterns
FOR UPDATE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
)
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS fault_patterns_delete ON public.fault_patterns;
CREATE POLICY fault_patterns_delete
ON public.fault_patterns
FOR DELETE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

-- MAINTENANCE PLAN ITEMS
DROP POLICY IF EXISTS maintenance_plan_items_select ON public.maintenance_plan_items;
CREATE POLICY maintenance_plan_items_select
ON public.maintenance_plan_items
FOR SELECT
USING (public.machine_visible_to_current_user(machine_id));

DROP POLICY IF EXISTS maintenance_plan_items_insert ON public.maintenance_plan_items;
CREATE POLICY maintenance_plan_items_insert
ON public.maintenance_plan_items
FOR INSERT
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS maintenance_plan_items_update ON public.maintenance_plan_items;
CREATE POLICY maintenance_plan_items_update
ON public.maintenance_plan_items
FOR UPDATE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
)
WITH CHECK (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

DROP POLICY IF EXISTS maintenance_plan_items_delete ON public.maintenance_plan_items;
CREATE POLICY maintenance_plan_items_delete
ON public.maintenance_plan_items
FOR DELETE
USING (
  public.can_manage_org(public.machine_org_for_current_user(machine_id))
);

-- DIAGNOSTIC SESSIONS
DROP POLICY IF EXISTS diagnostic_sessions_select ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_select
ON public.diagnostic_sessions
FOR SELECT
USING (
  public.same_org(organization_id)
  OR public.machine_visible_to_current_user(machine_id)
);

DROP POLICY IF EXISTS diagnostic_sessions_insert ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_insert
ON public.diagnostic_sessions
FOR INSERT
WITH CHECK (
  public.can_manage_work_orders(organization_id)
);

DROP POLICY IF EXISTS diagnostic_sessions_update ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_update
ON public.diagnostic_sessions
FOR UPDATE
USING (
  public.can_manage_work_orders(organization_id)
)
WITH CHECK (
  public.can_manage_work_orders(organization_id)
);

DROP POLICY IF EXISTS diagnostic_sessions_delete ON public.diagnostic_sessions;
CREATE POLICY diagnostic_sessions_delete
ON public.diagnostic_sessions
FOR DELETE
USING (
  public.can_manage_work_orders(organization_id)
);

-- WORK ORDERS
DROP POLICY IF EXISTS work_orders_select ON public.work_orders;
CREATE POLICY work_orders_select
ON public.work_orders
FOR SELECT
USING (
  public.same_org(organization_id)
  OR assigned_to = auth.uid()
);

DROP POLICY IF EXISTS work_orders_insert ON public.work_orders;
CREATE POLICY work_orders_insert
ON public.work_orders
FOR INSERT
WITH CHECK (
  public.can_manage_work_orders(organization_id)
);

DROP POLICY IF EXISTS work_orders_update ON public.work_orders;
CREATE POLICY work_orders_update
ON public.work_orders
FOR UPDATE
USING (
  public.can_manage_work_orders(organization_id)
  OR assigned_to = auth.uid()
)
WITH CHECK (
  public.can_manage_work_orders(organization_id)
  OR assigned_to = auth.uid()
);

DROP POLICY IF EXISTS work_orders_delete ON public.work_orders;
CREATE POLICY work_orders_delete
ON public.work_orders
FOR DELETE
USING (
  public.can_manage_work_orders(organization_id)
);

-- PART ORDERS
DROP POLICY IF EXISTS part_orders_select ON public.part_orders;
CREATE POLICY part_orders_select
ON public.part_orders
FOR SELECT
USING (public.same_org(organization_id));

DROP POLICY IF EXISTS part_orders_insert ON public.part_orders;
CREATE POLICY part_orders_insert
ON public.part_orders
FOR INSERT
WITH CHECK (
  public.can_manage_procurement(organization_id)
);

DROP POLICY IF EXISTS part_orders_update ON public.part_orders;
CREATE POLICY part_orders_update
ON public.part_orders
FOR UPDATE
USING (
  public.can_manage_procurement(organization_id)
)
WITH CHECK (
  public.can_manage_procurement(organization_id)
);

DROP POLICY IF EXISTS part_orders_delete ON public.part_orders;
CREATE POLICY part_orders_delete
ON public.part_orders
FOR DELETE
USING (
  public.can_manage_procurement(organization_id)
);

-- PART ORDER ITEMS
DROP POLICY IF EXISTS part_order_items_select ON public.part_order_items;
CREATE POLICY part_order_items_select
ON public.part_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.part_orders po
    WHERE po.id = part_order_items.part_order_id
      AND public.same_org(po.organization_id)
  )
);

DROP POLICY IF EXISTS part_order_items_insert ON public.part_order_items;
CREATE POLICY part_order_items_insert
ON public.part_order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.part_orders po
    WHERE po.id = part_order_items.part_order_id
      AND public.can_manage_procurement(po.organization_id)
  )
);

DROP POLICY IF EXISTS part_order_items_update ON public.part_order_items;
CREATE POLICY part_order_items_update
ON public.part_order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.part_orders po
    WHERE po.id = part_order_items.part_order_id
      AND public.can_manage_procurement(po.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.part_orders po
    WHERE po.id = part_order_items.part_order_id
      AND public.can_manage_procurement(po.organization_id)
  )
);

DROP POLICY IF EXISTS part_order_items_delete ON public.part_order_items;
CREATE POLICY part_order_items_delete
ON public.part_order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.part_orders po
    WHERE po.id = part_order_items.part_order_id
      AND public.can_manage_procurement(po.organization_id)
  )
);

-- ACTIVITY LOGS
DROP POLICY IF EXISTS activity_logs_select ON public.activity_logs;
CREATE POLICY activity_logs_select
ON public.activity_logs
FOR SELECT
USING (public.same_org(organization_id));

DROP POLICY IF EXISTS activity_logs_insert ON public.activity_logs;
CREATE POLICY activity_logs_insert
ON public.activity_logs
FOR INSERT
WITH CHECK (public.same_org(organization_id));

COMMIT;
