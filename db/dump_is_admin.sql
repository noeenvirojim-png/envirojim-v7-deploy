DO $$
DECLARE
    def text;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin';
    
    RAISE NOTICE 'is_admin definition: %', def;
END $$;
