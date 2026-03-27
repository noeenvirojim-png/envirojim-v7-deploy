-- CLEAN_AUTH_USERS.sql
-- Deletes users to allow clean API re-seeding

DO $$
BEGIN
    DELETE FROM auth.users WHERE email IN (
        'parts@envirojim.com', 
        'manager@acmemining.com', 
        'operator@acmemining.com', 
        'admin@northernsp.com', 
        'tech@northernsp.com'
    );
    
    RAISE NOTICE 'Cleaned up auth users.';
END $$;
