DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '--- FOREIGN KEYS REFERENCING public.users ---';
    FOR r IN 
        SELECT
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='users' AND ccu.table_schema='public'
    LOOP
        RAISE NOTICE 'FK FOUND: %.% (%)', r.table_schema, r.table_name, r.column_name;
    END LOOP;
END $$;
