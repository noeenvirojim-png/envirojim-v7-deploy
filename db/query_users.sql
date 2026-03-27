DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- PUBLIC USERS ---';
    FOR r IN SELECT id, email, role FROM public.users LOOP
        RAISE NOTICE 'PUBLIC: id=%, email=%, role=%', r.id, r.email, r.role;
    END LOOP;
    
    RAISE NOTICE '--- AUTH USERS ---';
    FOR r IN SELECT id, email, role, aud FROM auth.users LOOP
        RAISE NOTICE 'AUTH: id=%, email=%, role=%, aud=%', r.id, r.email, r.role, r.aud;
    END LOOP;

    RAISE NOTICE '--- AUTH IDENTITIES ---';
    FOR r IN SELECT user_id, provider, provider_id FROM auth.identities LOOP
        RAISE NOTICE 'IDENTITY: user_id=%, provider=%, provider_id=%', r.user_id, r.provider, r.provider_id;
    END LOOP;
END $$;
