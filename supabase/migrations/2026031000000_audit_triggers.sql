-- ENVIROJIM - AUDIT SYSTEM (Stabilized for V9)
-- This migration sets up the generic audit logging system.

-- 1. Create audit_logs table (Safe creation)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger AS $$
DECLARE
    entity_name text := TG_TABLE_NAME;
    action_name text := TG_OP;
    user_id uuid := auth.uid();
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
    VALUES (
        user_id,
        action_name,
        entity_name,
        CASE 
            WHEN action_name = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        CASE 
            WHEN action_name = 'DELETE' THEN row_to_json(OLD)::jsonb
            ELSE row_to_json(NEW)::jsonb
        END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach triggers to V9 tables (Safely)

-- Audit for Organizations
DROP TRIGGER IF EXISTS audit_organizations_trigger ON public.organizations;
CREATE TRIGGER audit_organizations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Audit for Users
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Audit for Machines
DROP TRIGGER IF EXISTS audit_machines_trigger ON public.machines;
CREATE TRIGGER audit_machines_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.machines
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Audit for Work Orders (V9 name for Tickets)
DROP TRIGGER IF EXISTS audit_work_orders_trigger ON public.work_orders;
CREATE TRIGGER audit_work_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Audit for Parts
DROP TRIGGER IF EXISTS audit_parts_trigger ON public.parts;
CREATE TRIGGER audit_parts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.parts
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Audit for Part Orders
DROP TRIGGER IF EXISTS audit_part_orders_trigger ON public.part_orders;
CREATE TRIGGER audit_part_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.part_orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
