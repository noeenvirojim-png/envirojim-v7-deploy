-- POLICY_AUTH_ADMIN_BYPASS.sql
-- Explicitly allow supabase_auth_admin to read all users to prevent recursion/locking

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Auth Admin Bypass" ON public.users;

-- Create robust policy
CREATE POLICY "Auth Admin Bypass" ON public.users
    FOR SELECT
    TO supabase_auth_admin
    USING (true);
