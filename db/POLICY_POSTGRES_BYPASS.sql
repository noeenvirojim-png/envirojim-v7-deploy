-- POLICY_POSTGRES_BYPASS.sql
-- Allow postgres user to see all rows for debugging

-- Rename role if needed, assumes 'postgres' is the current user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Postgres Bypass' AND tablename = 'users'
    ) THEN
        CREATE POLICY "Postgres Bypass" ON public.users
            FOR ALL
            TO postgres
            USING (true)
            WITH CHECK (true);
        RAISE NOTICE '✅ Postgres Bypass Policy Created';
    ELSE
        RAISE NOTICE '⚠️ Postgres Bypass Policy Exists';
    END IF;
END $$;
