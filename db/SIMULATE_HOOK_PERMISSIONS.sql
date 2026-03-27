-- SIMULATE_HOOK_PERMISSIONS.sql
-- Check if valid grants exist for the auth system

DO $$
DECLARE
    r_count integer;
BEGIN
    RAISE NOTICE 'Testing permissions...';
    
    -- check usage on schema public
    IF has_schema_privilege('supabase_auth_admin', 'public', 'USAGE') THEN
        RAISE NOTICE '✅ supabase_auth_admin has USAGE on public';
    ELSE
        RAISE NOTICE '❌ supabase_auth_admin MISSING USAGE on public';
    END IF;

    -- check select on public.users
    IF has_table_privilege('supabase_auth_admin', 'public.users', 'SELECT') THEN
        RAISE NOTICE '✅ supabase_auth_admin has SELECT on public.users';
    ELSE
        RAISE NOTICE '❌ supabase_auth_admin MISSING SELECT on public.users';
    END IF;

    -- check execute on function
    IF has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') THEN
        RAISE NOTICE '✅ supabase_auth_admin has EXECUTE on hook';
    ELSE
        RAISE NOTICE '❌ supabase_auth_admin MISSING EXECUTE on hook';
    END IF;

END $$;
