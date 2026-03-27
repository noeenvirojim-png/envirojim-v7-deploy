-- ============================================================================
-- TEST SCRIPT: JWT Claims Auth Hook Verification
-- ============================================================================
-- Purpose: Comprehensive testing of custom_access_token_hook function
-- Run this after deploying AUTH_JWT_CLAIMS_MIGRATION.sql
-- ============================================================================

-- ============================================================================
-- TEST 1: SUPER_ADMIN User (Noé EVE)
-- ============================================================================
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    claims jsonb;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 1: SUPER_ADMIN Login';
    RAISE NOTICE '========================================';

    -- Build test event for SUPER_ADMIN
    test_event := jsonb_build_object(
        'user_id', '00000000-0000-0000-0000-000000000001'
    );

    -- Call Auth Hook
    result := public.custom_access_token_hook(test_event);
    claims := result->'claims';

    -- Verify claims structure
    IF claims->>'role' = 'SUPER_ADMIN' 
       AND claims->>'org_id' IS NOT NULL
       AND claims->'user_metadata'->>'full_name' = 'Noé EVE' THEN
        RAISE NOTICE '✅ SUPER_ADMIN claims valid';
        RAISE NOTICE '   Role: %', claims->>'role';
        RAISE NOTICE '   Org ID: %', claims->>'org_id';
        RAISE NOTICE '   Full Name: %', claims->'user_metadata'->>'full_name';
    ELSE
        RAISE WARNING '❌ SUPER_ADMIN claims INVALID';
        RAISE WARNING '   Expected role: SUPER_ADMIN, got: %', claims->>'role';
        RAISE WARNING '   Full claims: %', claims;
    END IF;
END $$;

-- ============================================================================
-- TEST 2: ENVIROJIM_ADMIN User (Alexandre Paré)
-- ============================================================================
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    claims jsonb;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 2: ENVIROJIM_ADMIN Login';
    RAISE NOTICE '========================================';

    -- Build test event for ENVIROJIM_ADMIN
    test_event := jsonb_build_object(
        'user_id', '00000000-0000-0000-0000-000000000002'
    );

    -- Call Auth Hook
    result := public.custom_access_token_hook(test_event);
    claims := result->'claims';

    -- Verify claims structure
    IF claims->>'role' = 'ENVIROJIM_ADMIN' 
       AND claims->>'org_id' IS NOT NULL
       AND claims->'user_metadata'->>'full_name' = 'Alexandre Paré' THEN
        RAISE NOTICE '✅ ENVIROJIM_ADMIN claims valid';
        RAISE NOTICE '   Role: %', claims->>'role';
        RAISE NOTICE '   Org ID: %', claims->>'org_id';
        RAISE NOTICE '   Full Name: %', claims->'user_metadata'->>'full_name';
    ELSE
        RAISE WARNING '❌ ENVIROJIM_ADMIN claims INVALID';
        RAISE WARNING '   Expected role: ENVIROJIM_ADMIN, got: %', claims->>'role';
        RAISE WARNING '   Full claims: %', claims;
    END IF;
END $$;

-- ============================================================================
-- TEST 3: Deleted User (Should Return Empty Claims)
-- ============================================================================
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    claims jsonb;
    deleted_user_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 3: Deleted User';
    RAISE NOTICE '========================================';

    -- Create a temporary deleted user for testing
    INSERT INTO public.users (id, organization_id, role, email, full_name, deleted_at)
    VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001',
        'OPERATOR',
        'deleted-test@example.com',
        'Deleted Test User',
        NOW()
    )
    RETURNING id INTO deleted_user_id;

    -- Build test event
    test_event := jsonb_build_object('user_id', deleted_user_id);

    -- Call Auth Hook
    result := public.custom_access_token_hook(test_event);
    claims := result->'claims';

    -- Verify empty claims
    IF claims = '{}'::jsonb THEN
        RAISE NOTICE '✅ Deleted user correctly returns empty claims';
    ELSE
        RAISE WARNING '❌ Deleted user should return empty claims';
        RAISE WARNING '   Got: %', claims;
    END IF;

    -- Cleanup
    DELETE FROM public.users WHERE id = deleted_user_id;
END $$;

-- ============================================================================
-- TEST 4: Non-Existent User (Should Return Empty Claims)
-- ============================================================================
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    claims jsonb;
    fake_user_id uuid := '99999999-9999-9999-9999-999999999999';
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 4: Non-Existent User';
    RAISE NOTICE '========================================';

    -- Build test event with fake UUID
    test_event := jsonb_build_object('user_id', fake_user_id);

    -- Call Auth Hook
    result := public.custom_access_token_hook(test_event);
    claims := result->'claims';

    -- Verify empty claims
    IF claims = '{}'::jsonb THEN
        RAISE NOTICE '✅ Non-existent user correctly returns empty claims';
    ELSE
        RAISE WARNING '❌ Non-existent user should return empty claims';
        RAISE WARNING '   Got: %', claims;
    END IF;
END $$;

-- ============================================================================
-- TEST 5: Invalid UUID (Should Handle Gracefully)
-- ============================================================================
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    claims jsonb;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 5: Invalid UUID';
    RAISE NOTICE '========================================';

    -- Build test event with invalid UUID
    test_event := jsonb_build_object('user_id', 'not-a-uuid');

    -- Call Auth Hook (should handle error gracefully)
    result := public.custom_access_token_hook(test_event);
    claims := result->'claims';

    -- Verify empty claims
    IF claims = '{}'::jsonb THEN
        RAISE NOTICE '✅ Invalid UUID correctly returns empty claims';
    ELSE
        RAISE WARNING '❌ Invalid UUID should return empty claims';
        RAISE WARNING '   Got: %', claims;
    END IF;
END $$;

-- ============================================================================
-- TEST 6: RLS Policy Verification (Users Table)
-- ============================================================================
-- Verify that RLS policies still work correctly with JWT claims
DO $$
DECLARE
    policy_def TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST 6: RLS Policy Check';
    RAISE NOTICE '========================================';

    -- Check user_read policy
    SELECT pg_get_expr(qual, 'public.users'::regclass)
    INTO policy_def
    FROM pg_policy
    WHERE tablename = 'users' 
    AND policyname = 'user_read';

    IF policy_def LIKE '%auth.uid()%' THEN
        RAISE NOTICE '✅ user_read policy includes auth.uid() short-circuit';
        RAISE NOTICE '   Policy: %', policy_def;
    ELSE
        RAISE WARNING '⚠️  user_read policy may not have optimal short-circuit';
        RAISE NOTICE '   Policy: %', policy_def;
    END IF;
END $$;

-- ============================================================================
-- SUMMARY: All Tests Complete
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ALL TESTS COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Configure Auth Hook in Supabase Dashboard';
    RAISE NOTICE '2. Test login via application';
    RAISE NOTICE '3. Decode JWT at https://jwt.io';
    RAISE NOTICE '4. Deploy application code changes';
    RAISE NOTICE '========================================';
END $$;
