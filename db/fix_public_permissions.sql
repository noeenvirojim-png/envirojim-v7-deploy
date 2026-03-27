DO $$
BEGIN
    -- Grant usage on schema
    GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

    -- Grant tables permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon; -- Cautious grant for anon

    -- Grant sequence permissions
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

    RAISE NOTICE 'Permissions on public schema granted.';
END $$;
