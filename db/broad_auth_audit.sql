DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- BROAD TRIGGER AUDIT (auth schema) ---';
    FOR r IN 
        SELECT trigger_name, event_object_table, action_statement 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth'
    LOOP
        RAISE NOTICE 'TRIGGER: %.% -> %', r.event_object_table, r.trigger_name, r.action_statement;
    END LOOP;

    RAISE NOTICE '--- RLS POLICIES (auth schema) ---';
    FOR r IN 
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'auth'
    LOOP
        RAISE NOTICE 'POLICY: % on % (CMD: %) -> %', r.policyname, r.tablename, r.cmd, r.qual;
    END LOOP;
END $$;
