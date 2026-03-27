DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- TABLE OWNERSHIP & PERMISSIONS (auth) ---';
    FOR r IN 
        SELECT 
            tablename, 
            tableowner,
            has_table_privilege('postgres', 'auth.' || tablename, 'SELECT') as postgres_select,
            has_table_privilege('service_role', 'auth.' || tablename, 'SELECT') as service_select,
            has_table_privilege('anon', 'auth.' || tablename, 'SELECT') as anon_select,
            has_table_privilege('supabase_auth_admin', 'auth.' || tablename, 'SELECT') as auth_admin_select
        FROM pg_tables 
        WHERE schemaname = 'auth'
    LOOP
        RAISE NOTICE 'TABLE: %, OWNER: %, POSTGRES: %, SERVICE: %, ANON: %, AUTH_ADMIN: %', 
            r.tablename, r.tableowner, r.postgres_select, r.service_select, r.anon_select, r.auth_admin_select;
    END LOOP;
END $$;
