DO $$
DECLARE
    r RECORD;
BEGIN
    SELECT provider, provider_id, identity_data
    INTO r FROM auth.identities i
    JOIN auth.users u ON i.user_id = u.id
    WHERE u.email = 'noe@envirojim.com' LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE 'SUCCESS_IDEN: provider=%, prov_id=%, data=%', 
            r.provider, r.provider_id, r.identity_data;
    END IF;
END $$;
