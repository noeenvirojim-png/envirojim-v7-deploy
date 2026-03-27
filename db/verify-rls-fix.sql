-- ============================================================================
-- RLS Fix Verification Tests
-- ============================================================================
-- Run these tests in Supabase SQL Editor to verify the RLS fix works
-- ============================================================================

-- Test 1: Verify policy was updated
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' AND policyname = 'user_read';

-- Expected: qual should contain "id = auth.uid()"

-- Test 2: User can read own record
-- ============================================================================
-- Set session to Noé's user ID
SET LOCAL "request.jwt.claim.sub" = 'c50a5cbb-900e-4ff6-ad7e-60a9b94eb2fa';
SET ROLE authenticated;

SELECT * FROM public.users WHERE id = 'c50a5cbb-900e-4ff6-ad7e-60a9b94eb2fa';
-- Expected: 1 row returned (Noé EVE)

RESET ROLE;

-- Test 3: User CANNOT read other user's record
-- ============================================================================
SET LOCAL "request.jwt.claim.sub" = 'c50a5cbb-900e-4ff6-ad7e-60a9b94eb2fa';
SET ROLE authenticated;

SELECT * FROM public.users WHERE id = '2d81b02a-476d-473f-84a5-4187c6d2412f';
-- Expected: 0 rows (blocked by RLS - different user, not in hierarchy yet)

RESET ROLE;

-- Test 4: Admin can read users in hierarchy
-- ============================================================================
-- First, create a test organization hierarchy
INSERT INTO public.organizations (id, name, type, parent_id)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Client', 'CLIENT', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Create test user in client org
INSERT INTO public.users (id, organization_id, role, email, full_name)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'OPERATOR', 'test@client.com', 'Test User')
ON CONFLICT DO NOTHING;

-- Set session to Noé (SUPER_ADMIN at EnviroJim HQ)
SET LOCAL "request.jwt.claim.sub" = 'c50a5cbb-900e-4ff6-ad7e-60a9b94eb2fa';
SET ROLE authenticated;

-- Try to read test user (should succeed - in hierarchy)
SELECT * FROM public.users WHERE id = '22222222-2222-2222-2222-222222222222';
-- Expected: 1 row (Noé can see users in child orgs)

RESET ROLE;

-- Test 5: Security - Isolated users cannot see each other
-- ============================================================================
-- Create two isolated orgs
INSERT INTO public.organizations (id, name, type)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', 'CLIENT')
ON CONFLICT DO NOTHING;

INSERT INTO public.organizations (id, name, type)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', 'CLIENT')
ON CONFLICT DO NOTHING;

-- Create users in each org
INSERT INTO public.users (id, organization_id, role, email, full_name)
VALUES ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'OPERATOR', 'usera@orga.com', 'User A')
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, organization_id, role, email, full_name)
VALUES ('bbbbbbbb-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'OPERATOR', 'userb@orgb.com', 'User B')
ON CONFLICT DO NOTHING;

-- Set session to User A
SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-1111-1111-1111-111111111111';
SET ROLE authenticated;

-- Try to read User B (should FAIL - different org, no hierarchy)
SELECT * FROM public.users WHERE id = 'bbbbbbbb-2222-2222-2222-222222222222';
-- Expected: 0 rows (BLOCKED by RLS)

-- Try to read own record (should SUCCEED)
SELECT * FROM public.users WHERE id = 'aaaaaaaa-1111-1111-1111-111111111111';
-- Expected: 1 row

RESET ROLE;

-- Cleanup test data
-- ============================================================================
DELETE FROM public.users WHERE id IN (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-1111-1111-1111-111111111111',
    'bbbbbbbb-2222-2222-2222-222222222222'
);

DELETE FROM public.organizations WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

-- ============================================================================
-- Summary
-- ============================================================================
-- If all tests passed:
-- ✅ Test 1: Policy contains "id = auth.uid()"
-- ✅ Test 2: User can read own record
-- ✅ Test 3: User cannot read other user's record
-- ✅ Test 4: Admin can read users in hierarchy
-- ✅ Test 5: Isolated users cannot see each other
-- 
-- RLS fix is working correctly! ✅
