DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- USER DELETED STATUS ---';
    FOR r IN SELECT email, deleted_at FROM public.users WHERE email = 'noe@envirojim.com' LOOP
        RAISE NOTICE 'USER: %, DELETED_AT: %', r.email, r.deleted_at;
    END LOOP;

    RAISE NOTICE '--- MACHINES DELETED STATUS ---';
    FOR r IN SELECT count(*) as count, deleted_at FROM public.machines GROUP BY deleted_at LOOP
        RAISE NOTICE 'MACHINES DELETED_AT: % (COUNT: %)', r.deleted_at, r.count;
    END LOOP;
END $$;
