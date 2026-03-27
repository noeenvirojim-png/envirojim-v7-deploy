-- ============================================================================
-- ENVIROJIM PLATFORM - MASTER SCHEMA V6 (FINAL)
-- ============================================================================

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.manuals CASCADE;
DROP TABLE IF EXISTS public.maintenance_rules CASCADE;
DROP TABLE IF EXISTS public.checklist_templates CASCADE;
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.interventions CASCADE;
DROP TABLE IF EXISTS public.intervention_parts CASCADE;
DROP TABLE IF EXISTS public.part_request_items CASCADE;
DROP TABLE IF EXISTS public.part_requests CASCADE;
DROP TABLE IF EXISTS public.parts_catalog CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.maintenance_definitions CASCADE;
DROP TABLE IF EXISTS public.notification_logs CASCADE;
DROP TABLE IF EXISTS public.rfqs CASCADE;
DROP TABLE IF EXISTS public.supplier_quotes CASCADE;

DROP TYPE IF EXISTS public.org_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.request_urgency CASCADE;
DROP TYPE IF EXISTS public.outcome_type CASCADE;
DROP TYPE IF EXISTS public.document_type CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.org_type AS ENUM ('ENVIROJIM', 'SERVICE_PROVIDER', 'CLIENT');
CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN', 'TECHNICIAN', 'OPERATOR');
CREATE TYPE public.request_status AS ENUM ('DRAFT', 'PENDING', 'ORDERED', 'SHIPPED', 'DELIVERED', 'CLOSED');
CREATE TYPE public.request_urgency AS ENUM ('NORMAL', 'HIGH', 'EMERGENCY');
CREATE TYPE public.document_type AS ENUM ('MANUAL', 'SPEC_SHEET', 'SERVICE_REPORT', 'INVOICE');

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type org_type NOT NULL,
    parent_id UUID REFERENCES public.organizations(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    role user_role NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email_active ON public.users(email) WHERE deleted_at IS NULL;

CREATE TABLE public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    site_id UUID REFERENCES public.sites(id),
    assigned_partner_id UUID REFERENCES public.organizations(id),
    serial_number VARCHAR(100) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    current_hours INTEGER DEFAULT 0,
    engine_make VARCHAR(100),
    engine_serial VARCHAR(100),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_machines_serial_active ON public.machines(organization_id, serial_number) WHERE deleted_at IS NULL;

CREATE TABLE public.parts_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_parts_active ON public.parts_catalog(part_number) WHERE deleted_at IS NULL;

CREATE TABLE public.part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    machine_id UUID NOT NULL REFERENCES public.machines(id),
    requester_user_id UUID NOT NULL REFERENCES public.users(id),
    status request_status DEFAULT 'PENDING',
    urgency request_urgency DEFAULT 'NORMAL',
    client_po_number VARCHAR(100),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.part_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.part_requests(id) ON DELETE CASCADE,
    part_catalog_id UUID REFERENCES public.parts_catalog(id),
    part_number_snapshot VARCHAR(100),
    part_name_snapshot VARCHAR(255),
    quantity_requested INTEGER DEFAULT 1,
    price_unit_cost DECIMAL(12, 2)
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    changed_by UUID,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    old_data JSONB,
    new_data JSONB
);

CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    machine_id UUID REFERENCES public.machines(id),
    title VARCHAR(255) NOT NULL,
    type document_type,
    file_url TEXT NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- Audit Trigger
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, action_type, changed_by, changed_at, old_data, new_data)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, auth.uid(), NOW(), 
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::JSONB END,
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::JSONB END);
    RETURN NULL;
END;
$$;

CREATE TRIGGER tr_audit_machines AFTER INSERT OR UPDATE OR DELETE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.log_audit();
