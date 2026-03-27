DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '--- FUNCTION OWNERS ---';
    FOR rec IN 
        SELECT p.proname, r.rolname as owner
        FROM pg_proc p
        JOIN pg_roles r ON p.proowner = r.oid
        WHERE p.proname IN ('is_admin', 'auth_org_id')
    LOOP
        RAISE NOTICE 'FUNCTION: %, OWNER: %', rec.proname, rec.owner;
    END LOOP;

    RAISE NOTICE '--- USERS RLS POLICIES ---';
    FOR rec IN 
        SELECT policyname, cmd, qual
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        RAISE NOTICE 'POLICY: % (CMD: %) -> %', rec.policyname, rec.cmd, rec.qual;
    END LOOP;
END $$;
