-- ============================================================================
-- ENVIROJIM V6 ENTERPRISE - SUPREME MASTER SCHEMA
-- Complete Security, Audit & RPC Extension
-- ============================================================================

-- 1. NUCLEAR CLEANUP & EXTENSIONS
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SET search_path = public, auth;

-- 2. ENUMS
-- ============================================================================
CREATE TYPE public.org_type AS ENUM ('ENVIROJIM', 'SERVICE_PROVIDER', 'CLIENT');
CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN', 'TECHNICIAN', 'OPERATOR');
CREATE TYPE public.request_status AS ENUM ('DRAFT', 'PENDING', 'ORDERED', 'SHIPPED', 'DELIVERED', 'CLOSED');
CREATE TYPE public.request_urgency AS ENUM ('NORMAL', 'HIGH', 'EMERGENCY');
CREATE TYPE public.document_type AS ENUM ('MANUAL', 'SPEC_SHEET', 'SERVICE_REPORT', 'INVOICE');

-- 3. CORE TABLES
-- ============================================================================

-- Organizations (Recursive Hierarchy)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type public.org_type NOT NULL,
    parent_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Auth Linked)
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- Matches auth.users.id
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'OPERATOR',
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_users_email_active ON public.users(email) WHERE (deleted_at IS NULL);

-- Sites
CREATE TABLE public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    assigned_partner_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    serial_number VARCHAR(100) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    current_hours INTEGER DEFAULT 0 CHECK (current_hours >= 0),
    engine_make VARCHAR(100),
    engine_serial VARCHAR(100),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_machines_serial_active ON public.machines(organization_id, serial_number) WHERE (deleted_at IS NULL);

-- Parts Catalog
CREATE TABLE public.parts_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) DEFAULT 0 CHECK (price >= 0),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_parts_active ON public.parts_catalog(part_number) WHERE (deleted_at IS NULL);

-- Part Requests
CREATE TABLE public.part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status public.request_status DEFAULT 'PENDING',
    urgency public.request_urgency DEFAULT 'NORMAL',
    client_po_number VARCHAR(100),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Part Request Items
CREATE TABLE public.part_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.part_requests(id) ON DELETE CASCADE,
    part_catalog_id UUID REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
    part_number_snapshot VARCHAR(100),
    part_name_snapshot VARCHAR(255),
    quantity_requested INTEGER DEFAULT 1 CHECK (quantity_requested > 0),
    price_unit_cost DECIMAL(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type public.document_type DEFAULT 'SPEC_SHEET',
    file_url TEXT NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (Immutable)
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
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read_admin" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ORG_ADMIN')));
REVOKE UPDATE, DELETE ON public.audit_logs FROM public, authenticated, service_role;

-- 4. SECURITY HELPERS & HIERARCHY
-- ============================================================================

-- Helper: Check if Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN' AND deleted_at IS NULL);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Check if Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ORG_ADMIN') AND deleted_at IS NULL);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Recursive Hierarchy CTE
CREATE OR REPLACE FUNCTION public.get_auth_org_hierarchy()
RETURNS TABLE (org_id UUID) AS $$
WITH RECURSIVE hierarchy AS (
    SELECT id FROM public.organizations 
    WHERE id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND deleted_at IS NULL
    UNION ALL
    SELECT o.id FROM public.organizations o
    INNER JOIN hierarchy h ON o.parent_id = h.id
    WHERE o.deleted_at IS NULL
)
SELECT id FROM hierarchy;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. ROW LEVEL SECURITY (FULL COVERAGE)
-- ============================================================================

-- ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON public.organizations FOR SELECT 
USING ((id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);
CREATE POLICY "org_admin_all" ON public.organizations FOR ALL 
USING (public.is_super_admin());

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_select" ON public.users FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);
CREATE POLICY "user_admin_all" ON public.users FOR ALL 
USING (public.is_admin());

-- SITES
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_select" ON public.sites FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);
CREATE POLICY "site_admin_all" ON public.sites FOR ALL 
USING (public.is_admin());

-- MACHINES
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "machine_select" ON public.machines FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) 
        OR assigned_partner_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) 
        OR public.is_admin()) AND deleted_at IS NULL);
CREATE POLICY "machine_admin_all" ON public.machines FOR ALL 
USING (public.is_admin());

-- PARTS_CATALOG (Read only for all auth, admin for modifications)
ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parts_select" ON public.parts_catalog FOR SELECT 
USING (deleted_at IS NULL);
CREATE POLICY "parts_admin" ON public.parts_catalog FOR ALL 
USING (public.is_admin());

-- PART_REQUESTS
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "request_select" ON public.part_requests FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);
CREATE POLICY "request_insert" ON public.part_requests FOR INSERT 
WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "request_update" ON public.part_requests FOR UPDATE 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);

-- PART_REQUEST_ITEMS
ALTER TABLE public.part_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON public.part_request_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.part_requests WHERE id = part_request_items.request_id));
CREATE POLICY "items_all" ON public.part_request_items FOR ALL 
USING (EXISTS (SELECT 1 FROM public.part_requests WHERE id = part_request_items.request_id));

-- DOCUMENTS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_select" ON public.documents FOR SELECT 
USING ((organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);
CREATE POLICY "doc_admin" ON public.documents FOR ALL 
USING (public.is_admin());

-- 6. AUDIT SYSTEM (EXTENDED)
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

-- Apply Audit to ALL Critical Tables
CREATE TRIGGER tr_audit_organizations AFTER INSERT OR UPDATE OR DELETE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_sites AFTER INSERT OR UPDATE OR DELETE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_machines AFTER INSERT OR UPDATE OR DELETE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_requests AFTER INSERT OR UPDATE OR DELETE ON public.part_requests FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_request_items AFTER INSERT OR UPDATE OR DELETE ON public.part_request_items FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_documents AFTER INSERT OR UPDATE OR DELETE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.log_audit();
CREATE TRIGGER tr_audit_parts AFTER INSERT OR UPDATE OR DELETE ON public.parts_catalog FOR EACH ROW EXECUTE FUNCTION public.log_audit();

-- 7. ZERO-TRUST RPC EXTENSIONS
-- ============================================================================

-- RPC: create_machine_with_document (Reinforced)
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

    INSERT INTO public.machines (organization_id, site_id, serial_number, make, model, year, current_hours, engine_make, engine_serial)
    VALUES (v_org_id, (p_machine_data->>'site_id')::UUID, p_machine_data->>'serial_number', p_machine_data->>'make', p_machine_data->>'model', (p_machine_data->>'year')::INTEGER, COALESCE((p_machine_data->>'current_hours')::INTEGER, 0), p_machine_data->>'engine_make', p_machine_data->>'engine_serial')
    RETURNING id INTO v_machine_id;

    IF p_document_data IS NOT NULL THEN
        INSERT INTO public.documents (organization_id, machine_id, title, type, file_url)
        VALUES (v_org_id, v_machine_id, p_document_data->>'title', (p_document_data->>'type')::public.document_type, p_document_data->>'file_url')
        RETURNING id INTO v_document_id;
    END IF;

    RETURN jsonb_build_object('machine_id', v_machine_id, 'document_id', v_document_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: create_part_request_with_items
CREATE OR REPLACE FUNCTION public.create_part_request_with_items(p_request_data JSONB, p_items_data JSONB)
RETURNS JSONB AS $$
DECLARE
    v_org_id UUID;
    v_machine_id UUID;
    v_request_id UUID;
    v_item JSONB;
BEGIN
    v_org_id := (p_request_data->>'organization_id')::UUID;
    v_machine_id := (p_request_data->>'machine_id')::UUID;

    -- Security: Access to machine or org
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.machines m 
        WHERE m.id = v_machine_id 
        AND (m.organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR m.assigned_partner_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()))
        AND m.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Access Denied: Machine unreachable';
    END IF;

    INSERT INTO public.part_requests (organization_id, machine_id, requester_user_id, status, urgency, client_po_number)
    VALUES (v_org_id, v_machine_id, auth.uid(), 'PENDING', (p_request_data->>'urgency')::public.request_urgency, p_request_data->>'client_po_number')
    RETURNING id INTO v_request_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data) LOOP
        INSERT INTO public.part_request_items (request_id, part_catalog_id, part_number_snapshot, part_name_snapshot, quantity_requested, price_unit_cost)
        VALUES (v_request_id, (v_item->>'part_catalog_id')::UUID, v_item->>'part_number', v_item->>'part_name', (v_item->>'quantity')::INTEGER, (v_item->>'price')::DECIMAL);
    END LOOP;

    RETURN jsonb_build_object('request_id', v_request_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: update_part_request_status
CREATE OR REPLACE FUNCTION public.update_part_request_status(p_request_id UUID, p_status public.request_status)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.part_requests r
        WHERE r.id = p_request_id AND r.organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy())
        AND r.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    UPDATE public.part_requests SET status = p_status, updated_at = NOW() WHERE id = p_request_id;
    RETURN jsonb_build_object('request_id', p_request_id, 'new_status', p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: update_document
CREATE OR REPLACE FUNCTION public.update_document(p_doc_id UUID, p_data JSONB)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = p_doc_id AND d.organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy())
        AND d.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    UPDATE public.documents SET 
        title = COALESCE(p_data->>'title', title),
        type = COALESCE((p_data->>'type')::public.document_type, type),
        file_url = COALESCE(p_data->>'file_url', file_url),
        updated_at = NOW()
    WHERE id = p_doc_id;

    RETURN jsonb_build_object('document_id', p_doc_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: delete_document (Soft Delete)
CREATE OR REPLACE FUNCTION public.delete_document(p_doc_id UUID)
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_admin() AND NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = p_doc_id AND d.organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy())
        AND d.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    UPDATE public.documents SET deleted_at = NOW() WHERE id = p_doc_id;
    RETURN jsonb_build_object('document_id', p_doc_id, 'deleted', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. PERFORMANCE & OPTIMIZATION
-- ============================================================================
CREATE INDEX idx_parts_catalog_search ON public.parts_catalog USING GIN (to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_machines_org_active ON public.machines(organization_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_requests_machine_active ON public.part_requests(machine_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_docs_machine_active ON public.documents(machine_id) WHERE (deleted_at IS NULL);

-- FIN.
