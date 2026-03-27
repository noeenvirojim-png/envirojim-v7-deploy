-- FIX_ALL_AUTH_PERMS.sql
-- Forcefully grant all necessary permissions to supabase_auth_admin to fix "Database error"

BEGIN;

-- 1. Schema Usage
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Table Select (Critical for public.users)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Sequence Usage (Critical for IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Function Execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMIT;
