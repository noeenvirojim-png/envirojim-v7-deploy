DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- CHECKING RLS ON auth.users ---';
    SELECT relrowsecurity, relforcerowsecurity INTO r 
    FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'auth' AND c.relname = 'users';
    
    RAISE NOTICE 'RLS ENABLED: %, FORCE RLS: %', r.relrowsecurity, r.relforcerowsecurity;
    
    RAISE NOTICE '--- ALL TRIGGERS ON auth.users (Any Schema) ---';
    FOR r IN 
        SELECT 
            t.trigger_name, 
            t.event_manipulation, 
            t.action_statement, 
            t.action_orientation,
            t.action_timing
        FROM information_schema.triggers t
        WHERE t.event_object_schema = 'auth' AND t.event_object_table = 'users'
    LOOP
        RAISE NOTICE 'TRIGGER: % (% %) -> %', r.trigger_name, r.action_timing, r.event_manipulation, r.action_statement;
    END LOOP;
END $$;
