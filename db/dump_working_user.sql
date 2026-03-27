DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM auth.users WHERE email = 'noe@envirojim.com' LOOP
        RAISE NOTICE 'USER_DUMP: %', row_to_json(r);
    END LOOP;
    
    FOR r IN SELECT * FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'noe@envirojim.com') LOOP
        RAISE NOTICE 'IDENTITY_DUMP: %', row_to_json(r);
    END LOOP;
END $$;
