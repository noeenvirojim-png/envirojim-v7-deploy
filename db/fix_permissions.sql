DO $$
BEGIN
    -- Grant usage on schema
    GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role, supabase_auth_admin;

    -- Grant all privileges on all tables in schema
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role, supabase_auth_admin;

    -- Grant select to anon/authenticated (be careful, normally RLS protects this, but we need to ensure they can at least "access" via RLS)
    GRANT SELECT ON ALL TABLES IN SCHEMA auth TO anon, authenticated;

    -- Ensure sequences are accessible
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role, supabase_auth_admin;

    RAISE NOTICE 'Permissions on auth schema granted.';
END $$;
