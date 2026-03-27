-- POLICY_SERVICE_ROLE.sql
-- Ensure service_role has full access to public.users

DROP POLICY IF EXISTS "Service Role Full Access" ON public.users;

CREATE POLICY "Service Role Full Access" ON public.users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
-- Also ensure supabase_auth_admin has full access if insertion happens via triggers
DROP POLICY IF EXISTS "Auth Admin Full Access" ON public.users;

CREATE POLICY "Auth Admin Full Access" ON public.users
    FOR ALL
    TO supabase_auth_admin
    USING (true)
    WITH CHECK (true);
