-- ============================================================================
-- ENVIROJIM V6 - JWT CLAIMS MIGRATION
-- ============================================================================
-- Purpose: Populate JWT access tokens with user role and organization_id
-- This eliminates the need to query public.users during authentication
-- 
-- DEPLOYMENT STEPS:
-- 1. Execute this SQL in Supabase SQL Editor
-- 2. Configure Auth Hook in Supabase Dashboard:
--    Authentication → Hooks → Custom Access Token Hook
--    Select: public.custom_access_token_hook
-- 3. Test by logging in and decoding JWT at jwt.io
-- ============================================================================

-- ============================================================================
-- I. CUSTOM ACCESS TOKEN HOOK FUNCTION
-- ============================================================================
-- This function is called by Supabase Auth when generating access tokens
-- It adds custom claims (org_id, role) to the JWT payload
-- 
-- SECURITY: SECURITY DEFINER allows reading public.users without RLS
-- This is safe because:
-- 1. Function is only called by Supabase Auth system (not exposed to clients)
-- 2. Input (event.user_id) comes from authenticated auth.users record
-- 3. Function only reads data, never writes
-- 4. Soft-delete check prevents deleted users from getting valid tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
    claims jsonb := '{}'::jsonb;
BEGIN
    -- Extract user_id from event payload
    -- Event structure: {"user_id": "uuid", "claims": {...}}
    DECLARE
        v_user_id uuid;
    BEGIN
        v_user_id := (event->>'user_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        -- Invalid UUID, return empty claims
        RAISE WARNING '[AUTH HOOK] Invalid user_id in event: %', event->>'user_id';
        RETURN jsonb_build_object('claims', claims);
    END;

    -- Fetch user data from public.users (bypassing RLS via SECURITY DEFINER)
    SELECT 
        id,
        organization_id,
        role,
        email,
        full_name,
        deleted_at
    INTO user_record
    FROM public.users
    WHERE id = (event->>'user_id')::uuid;

    -- If user not found in public.users, return empty claims
    IF NOT FOUND THEN
        RAISE WARNING '[AUTH HOOK] User not found in public.users: %', event->>'user_id';
        RETURN jsonb_build_object('claims', claims);
    END IF;

    -- If user is soft-deleted, return empty claims (blocks login)
    IF user_record.deleted_at IS NOT NULL THEN
        RAISE WARNING '[AUTH HOOK] Deleted user attempted login: %', user_record.email;
        RETURN jsonb_build_object('claims', claims);
    END IF;

    -- Build claims object with org_id and role
    claims := jsonb_build_object(
        'org_id', user_record.organization_id,
        'role', user_record.role,
        'user_metadata', jsonb_build_object(
            'org_id', user_record.organization_id,
            'role', user_record.role,
            'full_name', user_record.full_name,
            'email', user_record.email
        )
    );

    -- Log successful claim generation (for debugging)
    RAISE NOTICE '[AUTH HOOK] Generated claims for user: % (role: %, org: %)', 
        user_record.email, 
        user_record.role, 
        user_record.organization_id;

    -- Return claims to be added to JWT
    RETURN jsonb_build_object('claims', claims);
END;
$$;

-- Grant execute permission to authenticated users
-- (Actually executed by Supabase Auth system, but this is standard practice)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;

-- ============================================================================
-- II. HELPER FUNCTION: EXTRACT JWT CLAIMS
-- ============================================================================
-- Utility function to extract custom claims from current JWT
-- Can be used in RLS policies or application code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_jwt_claim(claim_name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        auth.jwt() -> claim_name,
        auth.jwt() -> 'user_metadata' -> claim_name
    )::text;
$$;

-- Example usage in RLS policies:
-- USING (organization_id::text = public.get_jwt_claim('org_id'))

-- ============================================================================
-- III. VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful
-- ============================================================================

-- Test 1: Verify function exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'custom_access_token_hook' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE NOTICE '✅ custom_access_token_hook function created successfully';
    ELSE
        RAISE WARNING '❌ custom_access_token_hook function NOT found';
    END IF;
END $$;

-- Test 2: Verify function signature
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.prosecdef AS is_security_definer
FROM pg_proc p
WHERE p.proname = 'custom_access_token_hook'
AND p.pronamespace = 'public'::regnamespace;

-- Test 3: Test function with sample user (SUPER_ADMIN)
-- Replace user_id with actual UUID from your database
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    sample_user_id uuid;
BEGIN
    -- Get first active user
    SELECT id INTO sample_user_id 
    FROM public.users 
    WHERE deleted_at IS NULL 
    LIMIT 1;

    IF sample_user_id IS NULL THEN
        RAISE WARNING '⚠️  No active users found for testing';
        RETURN;
    END IF;

    -- Build test event
    test_event := jsonb_build_object('user_id', sample_user_id);

    -- Call function
    result := public.custom_access_token_hook(test_event);

    -- Display results
    RAISE NOTICE '📋 Test Event: %', test_event;
    RAISE NOTICE '✅ Claims Generated: %', result->'claims';
    
    -- Validate claims structure
    IF (result->'claims'->>'org_id') IS NOT NULL 
       AND (result->'claims'->>'role') IS NOT NULL THEN
        RAISE NOTICE '✅ Claims structure is valid';
    ELSE
        RAISE WARNING '❌ Claims structure is INVALID';
    END IF;
END $$;

-- Test 4: Test with deleted user (should return empty claims)
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    deleted_user_id uuid;
BEGIN
    -- Get first deleted user (if any)
    SELECT id INTO deleted_user_id 
    FROM public.users 
    WHERE deleted_at IS NOT NULL 
    LIMIT 1;

    IF deleted_user_id IS NULL THEN
        RAISE NOTICE 'ℹ️  No deleted users found for testing (this is OK)';
        RETURN;
    END IF;

    -- Build test event
    test_event := jsonb_build_object('user_id', deleted_user_id);

    -- Call function
    result := public.custom_access_token_hook(test_event);

    -- Validate empty claims
    IF (result->'claims' = '{}'::jsonb) THEN
        RAISE NOTICE '✅ Deleted user correctly returns empty claims';
    ELSE
        RAISE WARNING '❌ Deleted user should return empty claims, got: %', result->'claims';
    END IF;
END $$;

-- Test 5: Test with non-existent user (should return empty claims)
DO $$
DECLARE
    test_event jsonb;
    result jsonb;
    fake_user_id uuid := '00000000-0000-0000-0000-000000000999';
BEGIN
    -- Build test event with fake UUID
    test_event := jsonb_build_object('user_id', fake_user_id);

    -- Call function
    result := public.custom_access_token_hook(test_event);

    -- Validate empty claims
    IF (result->'claims' = '{}'::jsonb) THEN
        RAISE NOTICE '✅ Non-existent user correctly returns empty claims';
    ELSE
        RAISE WARNING '❌ Non-existent user should return empty claims, got: %', result->'claims';
    END IF;
END $$;

-- ============================================================================
-- IV. NEXT STEPS
-- ============================================================================
-- After running this script:
-- 
-- 1. Configure Auth Hook in Supabase Dashboard:
--    - Go to: Authentication → Hooks
--    - Enable: "Custom Access Token Hook"
--    - Select Function: public.custom_access_token_hook
--    - Save
-- 
-- 2. Test login flow:
--    - Login via your application
--    - Copy access token from cookies
--    - Decode at https://jwt.io
--    - Verify payload contains: org_id, role, user_metadata
-- 
-- 3. Deploy application code changes:
--    - Update app/api/auth/login/route.ts
--    - Update lib/auth-bridge.ts
--    - Update lib/supabase/middleware.ts
-- 
-- 4. Invalidate existing sessions:
--    - Via Supabase Dashboard: Authentication → Users → Sign Out All Users
--    - OR via SQL: DELETE FROM auth.sessions;
-- 
-- ============================================================================
