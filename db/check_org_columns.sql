DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- ORGANIZATIONS COLUMNS ---';
    FOR r IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' AND table_schema = 'public'
    LOOP
        RAISE NOTICE 'COLUMN: % (%)', r.column_name, r.data_type;
    END LOOP;
END $$;
