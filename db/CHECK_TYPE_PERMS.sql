DO $$
BEGIN
    RAISE NOTICE 'Checking user_role permissions...';
    IF has_type_privilege('supabase_auth_admin', 'public.user_role', 'USAGE') THEN
        RAISE NOTICE '✅ supabase_auth_admin has USAGE on TYPE user_role';
    ELSE
        RAISE NOTICE '❌ supabase_auth_admin MISSING USAGE on TYPE user_role';
    END IF;
END $$;
