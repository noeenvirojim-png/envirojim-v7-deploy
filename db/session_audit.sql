DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- GENERATED COLUMNS IN auth.users ---';
    FOR r IN 
        SELECT column_name, is_generated 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'users' AND is_generated = 'ALWAYS'
    LOOP
        RAISE NOTICE 'GENERATED COLUMN: %', r.column_name;
    END LOOP;

    RAISE NOTICE '--- TRIGGERS ON auth.sessions & auth.refresh_tokens ---';
    FOR r IN 
        SELECT trigger_name, event_object_table, action_statement 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' AND event_object_table IN ('sessions', 'refresh_tokens')
    LOOP
        RAISE NOTICE 'TRIGGER: %.% -> %', r.event_object_table, r.trigger_name, r.action_statement;
    END LOOP;
    
    RAISE NOTICE '--- PASSWORD HASH CHECK ---';
    FOR r IN SELECT email, substring(encrypted_password from 1 for 7) as hash_prefix FROM auth.users WHERE email IN ('noe@envirojim.com', 'tech@northernsp.com') LOOP
        RAISE NOTICE 'USER: %, HASH: %', r.email, r.hash_prefix;
    END LOOP;
END $$;
