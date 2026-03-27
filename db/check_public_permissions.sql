DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- TABLE PERMISSIONS (public) ---';
    FOR r IN 
        SELECT 
            tablename, 
            has_table_privilege('authenticated', 'public.' || tablename, 'SELECT') as auth_select
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        RAISE NOTICE 'TABLE: %, AUTH_SELECT: %', r.tablename, r.auth_select;
    END LOOP;
END $$;
