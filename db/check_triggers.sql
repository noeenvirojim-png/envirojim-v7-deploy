DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- TRIGGERS ON auth.users ---';
    FOR r IN 
        SELECT trigger_name, event_manipulation, action_statement 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' AND event_object_table = 'users'
    LOOP
        RAISE NOTICE 'TRIGGER: %, EVENT: %, ACTION: %', r.trigger_name, r.event_manipulation, r.action_statement;
    END LOOP;
END $$;
