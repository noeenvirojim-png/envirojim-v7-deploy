-- ============================================================================
-- ENVIROJIM V6 SUPREME MASTER SCHEMA
-- Consolidates: Core Tables, Hierarchy, Soft Delete, Audit Logs, RLS, Helpers, and RPCs
-- ============================================================================

-- 1. CLEANUP (Nuclear Reset)
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. EXTENSIONS & SEARCH PATH
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
SET search_path = public, auth;

-- 3. ENUMS
-- ============================================================================
CREATE TYPE public.org_type AS ENUM ('ENVIROJIM', 'SERVICE_PROVIDER', 'CLIENT');
CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN', 'TECHNICIAN', 'OPERATOR');
CREATE TYPE public.request_status AS ENUM ('DRAFT', 'PENDING', 'ORDERED', 'SHIPPED', 'DELIVERED', 'CLOSED');
CREATE TYPE public.request_urgency AS ENUM ('NORMAL', 'HIGH', 'EMERGENCY');
CREATE TYPE public.document_type AS ENUM ('MANUAL', 'SPEC_SHEET', 'SERVICE_REPORT', 'INVOICE');

-- 4. TABLES
-- ============================================================================

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type public.org_type NOT NULL,
    parent_id UUID REFERENCES public.organizations(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    role public.user_role NOT NULL,
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
    status public.request_status DEFAULT 'PENDING',
    urgency public.request_urgency DEFAULT 'NORMAL',
    client_po_number VARCHAR(100),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
    type public.document_type,
    file_url TEXT NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RECURSIVE SECURITY HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_org_hierarchy()
RETURNS TABLE (org_id UUID) AS $$
WITH RECURSIVE hierarchy AS (
    SELECT id FROM public.organizations 
    WHERE id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    UNION ALL
    SELECT o.id FROM public.organizations o
    INNER JOIN hierarchy h ON o.parent_id = h.id
)
SELECT id FROM hierarchy;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ORG_ADMIN')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_policy" ON public.organizations FOR SELECT 
USING ((id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);

CREATE POLICY "machine_read_policy" ON public.machines FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR assigned_partner_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);

-- 7. AUDIT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, action_type, changed_by, changed_at, old_data, new_data)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, auth.uid(), NOW(), 
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::JSONB END,
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::JSONB END);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_machines AFTER INSERT OR UPDATE OR DELETE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_requests AFTER INSERT OR UPDATE OR DELETE ON public.part_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 8. SECURED RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_machine_with_document(p_machine_data JSONB, p_document_data JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_machine_id UUID;
    v_document_id UUID;
BEGIN
    v_org_id := (p_machine_data->>'organization_id')::UUID;
    IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.get_auth_org_hierarchy() WHERE org_id = v_org_id) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    INSERT INTO public.machines (organization_id, serial_number, make, model, year, current_hours)
    VALUES (v_org_id, p_machine_data->>'serial_number', p_machine_data->>'make', p_machine_data->>'model', (p_machine_data->>'year')::INTEGER, COALESCE((p_machine_data->>'current_hours')::INTEGER, 0))
    RETURNING id INTO v_machine_id;

    IF p_document_data IS NOT NULL THEN
        INSERT INTO public.documents (organization_id, machine_id, title, file_url)
        VALUES (v_org_id, v_machine_id, p_document_data->>'title', p_document_data->>'file_url')
        RETURNING id INTO v_document_id;
    END IF;

    RETURN jsonb_build_object('machine_id', v_machine_id, 'document_id', v_document_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX idx_parts_search ON public.parts_catalog USING GIN (to_tsvector('english', name || ' ' || description));

-- FIN.
