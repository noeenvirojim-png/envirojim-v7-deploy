-- ============================================================================
-- Quick RLS Policy Fix - Apply to Existing Supabase Database
-- ============================================================================
-- This script ONLY updates the user_read policy to fix circular dependency
-- Run this if you already have the V6 schema deployed
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "user_read" ON public.users;

-- Recreate with fix: allow users to read their own record
CREATE POLICY "user_read" ON public.users FOR SELECT 
USING ((id = auth.uid() OR organization_id IN (SELECT org_id FROM public.get_auth_org_hierarchy()) OR public.is_admin()) AND deleted_at IS NULL);

-- Verify the fix
DO $$
DECLARE
    policy_def TEXT;
BEGIN
    SELECT qual::TEXT INTO policy_def
    FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'user_read';
    
    IF policy_def LIKE '%id = auth.uid()%' THEN
        RAISE NOTICE '✅ RLS policy updated successfully!';
        RAISE NOTICE 'Policy now allows users to read their own record.';
    ELSE
        RAISE WARNING '⚠️  Policy may not be correct. Please verify manually.';
    END IF;
END $$;

-- Test the policy (optional - requires setting session variables)
-- SET LOCAL "request.jwt.claim.sub" = '<your-user-id>';
-- SET ROLE authenticated;
-- SELECT * FROM public.users WHERE id = auth.uid();
-- RESET ROLE;
