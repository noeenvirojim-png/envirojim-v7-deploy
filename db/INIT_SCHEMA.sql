-- ============================================================================
-- ENVIROJIM PLATFORM - DATABASE INITIALIZATION SCRIPT (V2 - CLEAN & ROBUST)
-- ============================================================================
-- Version: 2.0.0
-- Date: 2026-02-09
-- Purpose: Complete schema initialization with production-grade security patterns.
-- 
-- KEY FEATURES:
-- 1. Clean Slate: Drops all existing objects to ensure a fresh start.
-- 2. Security First: Uses SECURITY DEFINER functions to bypass RLS recursion.
-- 3. Robust RLS: All policies use these safe functions instead of direct joins.
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire script.
-- 2. Go to Supabase Dashboard → SQL Editor.
-- 3. Paste and execute.
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEAN SLATE (Drop Everything)
-- ============================================================================

-- Drop tables in dependency order
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.diagnostic_sessions CASCADE;
DROP TABLE IF EXISTS public.diagnostic_nodes CASCADE;
DROP TABLE IF EXISTS public.diagnostic_options CASCADE;
DROP TABLE IF EXISTS public.part_request_items CASCADE;
DROP TABLE IF EXISTS public.part_requests CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.parts CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop functions to be recreated
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_org_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_user_creation() CASCADE;
DROP FUNCTION IF EXISTS public.log_user_deletion() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================================================
-- SECTION 2: CREATE HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================
-- These functions are created FIRST because RLS policies depend on them.
-- They bypass RLS safely to avoid infinite recursion loops.

-- Function: Check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id 
    AND role IN ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN')
  );
END;
$$;

-- Function: Get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org_id(user_id uuid)
RETURNS uuid 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id uuid;
BEGIN
    SELECT org_id INTO v_org_id
    FROM public.users
    WHERE id = user_id;
    RETURN v_org_id;
END;
$$;

-- ============================================================================
-- SECTION 3: CREATE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Organizations Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    owner_id UUID,
    CONSTRAINT organizations_name_not_empty CHECK (char_length(name) > 0)
);

CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);

-- ----------------------------------------------------------------------------
-- Users Table (Links to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'TECHNICIAN',
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_role_valid CHECK (role IN ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN', 'PARTS_MANAGER', 'TECHNICIAN', 'CLIENT'))
);

CREATE INDEX idx_users_org_id ON public.users(org_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Resolve circular dependency
ALTER TABLE public.organizations 
ADD CONSTRAINT fk_organizations_owner 
FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Machines Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT NOT NULL UNIQUE,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    location TEXT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT machines_serial_not_empty CHECK (char_length(serial_number) > 0),
    CONSTRAINT machines_year_valid CHECK (year IS NULL OR (year >= 1900 AND year <= 2100))
);

CREATE INDEX idx_machines_organization_id ON public.machines(organization_id);
CREATE INDEX idx_machines_serial_number ON public.machines(serial_number);

-- ----------------------------------------------------------------------------
-- Parts Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    catalog_ref TEXT UNIQUE,
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT parts_name_not_empty CHECK (char_length(name) > 0),
    CONSTRAINT parts_quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT parts_unit_price_non_negative CHECK (unit_price IS NULL OR unit_price >= 0)
);

CREATE INDEX idx_parts_machine_id ON public.parts(machine_id);
CREATE INDEX idx_parts_catalog_ref ON public.parts(catalog_ref);

-- ----------------------------------------------------------------------------
-- Diagnostic Sessions Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL DEFAULT 'STANDARD',
    result TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT diagnostic_type_valid CHECK (session_type IN ('STANDARD', 'ADVANCED', 'EMERGENCY'))
);

CREATE INDEX idx_diagnostic_sessions_machine_id ON public.diagnostic_sessions(machine_id);
CREATE INDEX idx_diagnostic_sessions_created_by ON public.diagnostic_sessions(created_by);
CREATE INDEX idx_diagnostic_sessions_created_at ON public.diagnostic_sessions(created_at);

-- ----------------------------------------------------------------------------
-- Diagnostic Nodes Table (Decision Tree)
-- ----------------------------------------------------------------------------
CREATE TABLE public.diagnostic_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.diagnostic_nodes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    node_type TEXT NOT NULL DEFAULT 'QUESTION',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT diagnostic_node_type_valid CHECK (node_type IN ('QUESTION', 'SOLUTION', 'REFERENCE'))
);

CREATE INDEX idx_diagnostic_nodes_machine_id ON public.diagnostic_nodes(machine_id);
CREATE INDEX idx_diagnostic_nodes_parent_id ON public.diagnostic_nodes(parent_id);

-- ----------------------------------------------------------------------------
-- Diagnostic Options Table (Decision Tree Answers)
-- ----------------------------------------------------------------------------
CREATE TABLE public.diagnostic_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES public.diagnostic_nodes(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    next_node_id UUID REFERENCES public.diagnostic_nodes(id) ON DELETE SET NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diagnostic_options_node_id ON public.diagnostic_options(node_id);
CREATE INDEX idx_diagnostic_options_next_node_id ON public.diagnostic_options(next_node_id);

-- ----------------------------------------------------------------------------
-- Part Requests Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    priority TEXT DEFAULT 'NORMAL',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT part_request_status_valid CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED')),
    CONSTRAINT part_request_priority_valid CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

CREATE INDEX idx_part_requests_requester_user_id ON public.part_requests(requester_user_id);
CREATE INDEX idx_part_requests_organization_id ON public.part_requests(organization_id);

-- ----------------------------------------------------------------------------
-- Part Request Items Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.part_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_request_id UUID NOT NULL REFERENCES public.part_requests(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT part_request_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_part_request_items_part_request_id ON public.part_request_items(part_request_id);

-- ----------------------------------------------------------------------------
-- Tickets Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    priority TEXT DEFAULT 'NORMAL',
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT ticket_status_valid CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT ticket_priority_valid CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

CREATE INDEX idx_tickets_machine_id ON public.tickets(machine_id);
CREATE INDEX idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX idx_tickets_organization_id ON public.tickets(organization_id);

-- ----------------------------------------------------------------------------
-- Audit Logs Table
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Users Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE TO authenticated 
    USING (auth.uid() = id);

-- ADMIN: Non-recursive check using function
CREATE POLICY "Admins can view users in their org" 
    ON public.users FOR SELECT TO authenticated 
    USING (public.is_admin(auth.uid()) AND org_id = public.get_user_org_id(auth.uid()));

-- ----------------------------------------------------------------------------
-- Organizations Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own organization" 
    ON public.organizations FOR SELECT TO authenticated 
    USING (id = public.get_user_org_id(auth.uid()));

-- ----------------------------------------------------------------------------
-- Machines Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view machines in own organization" 
    ON public.machines FOR SELECT TO authenticated 
    USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can insert machines" 
    ON public.machines FOR INSERT TO authenticated 
    WITH CHECK (public.is_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can update machines" 
    ON public.machines FOR UPDATE TO authenticated 
    USING (public.is_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- ----------------------------------------------------------------------------
-- Parts Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view parts for accessible machines" 
    ON public.parts FOR SELECT TO authenticated 
    USING (
        machine_id IS NULL OR EXISTS (
            SELECT 1 FROM public.machines m
            WHERE m.id = parts.machine_id 
            AND m.organization_id = public.get_user_org_id(auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- Diagnostic Sessions Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view diagnostics" 
    ON public.diagnostic_sessions FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.machines m
            WHERE m.id = diagnostic_sessions.machine_id
            AND m.organization_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Users can create diagnostics" 
    ON public.diagnostic_sessions FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.machines m
            WHERE m.id = diagnostic_sessions.machine_id
            AND m.organization_id = public.get_user_org_id(auth.uid())
        )
    );

-- ----------------------------------------------------------------------------
-- Part Requests Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own part requests" 
    ON public.part_requests FOR SELECT TO authenticated 
    USING (
        requester_user_id = auth.uid() OR
        (public.is_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()))
    );

CREATE POLICY "Users can create part requests" 
    ON public.part_requests FOR INSERT TO authenticated 
    WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Users can update own draft requests" 
    ON public.part_requests FOR UPDATE TO authenticated 
    USING (requester_user_id = auth.uid() AND status = 'DRAFT');

-- ----------------------------------------------------------------------------
-- Tickets Policies
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view tickets in own organization" 
    ON public.tickets FOR SELECT TO authenticated 
    USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can create tickets" 
    ON public.tickets FOR INSERT TO authenticated 
    WITH CHECK (created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- Audit Logs Policies (Admins Only)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can view audit logs" 
    ON public.audit_logs FOR SELECT TO authenticated 
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- SECTION 5: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_part_requests_updated_at BEFORE UPDATE ON public.part_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Log user creation
CREATE OR REPLACE FUNCTION public.log_user_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
    VALUES (NEW.id, 'USER_CREATED', 'users', NEW.id, jsonb_build_object('email', NEW.email, 'role', NEW.role));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_user_creation AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_user_creation();

-- Function: Log user deletion
CREATE OR REPLACE FUNCTION public.log_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
    VALUES (OLD.id, 'USER_DELETED', 'users', OLD.id, jsonb_build_object('email', OLD.email, 'role', OLD.role));
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_user_deletion BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.log_user_deletion();

-- ============================================================================
-- END OF SCRIPT - VERIFICATION
-- ============================================================================
SELECT 'SUCCESS: Schema V2 Initialized safely' as status;
