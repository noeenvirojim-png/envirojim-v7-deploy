DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- FUNCTION DEFINITIONS ---';
    FOR r IN 
        SELECT p.proname, pg_get_functiondef(p.oid) as def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname IN ('is_admin', 'auth_org_id', 'is_super_admin')
    LOOP
        RAISE NOTICE 'FUNCTION: % -> %', r.proname, r.def;
    END LOOP;
END $$;
