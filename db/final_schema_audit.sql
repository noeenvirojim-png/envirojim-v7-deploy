DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- auth.users columns ---';
    FOR r IN SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' LOOP
        RAISE NOTICE 'USER_COL: %', r.column_name;
    END LOOP;
    
    RAISE NOTICE '--- auth.identities columns ---';
    FOR r IN SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' LOOP
        RAISE NOTICE 'IDENTITY_COL: %', r.column_name;
    END LOOP;
END $$;
