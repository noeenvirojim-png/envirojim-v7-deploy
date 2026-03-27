DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- MACHINES RLS POLICIES ---';
    FOR r IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'machines'
    LOOP
        RAISE NOTICE 'POLICY: % (CMD: %) -> QUAL: %', r.policyname, r.cmd, r.qual;
    END LOOP;
END $$;
