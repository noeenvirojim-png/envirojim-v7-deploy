DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- USER ORG LINK ---';
    FOR r IN SELECT email, role, organization_id FROM public.users WHERE email = 'noe@envirojim.com' LOOP
        RAISE NOTICE 'USER: %, ROLE: %, ORG_ID: %', r.email, r.role, r.organization_id;
    END LOOP;

    RAISE NOTICE '--- ORGANIZATIONS ---';
    FOR r IN SELECT id, name FROM public.organizations LOOP
        RAISE NOTICE 'ORG: % - ID: %', r.name, r.id;
    END LOOP;

    RAISE NOTICE '--- MACHINES COUNT ---';
    FOR r IN SELECT count(*) as count FROM public.machines LOOP
        RAISE NOTICE 'TOTAL MACHINES: %', r.count;
    END LOOP;
    
    RAISE NOTICE '--- MACHINES IN ORG 1 ---';
    FOR r IN SELECT count(*) as count FROM public.machines WHERE organization_id = '00000000-0000-0000-0000-000000000001' LOOP
        RAISE NOTICE 'MACHINES IN HQ: %', r.count;
    END LOOP;
END $$;
