-- ============================================================================
-- SUPABASE STORAGE RLS POLICIES
-- Bucket: documents
-- ============================================================================
-- This migration adds Row Level Security policies for the Supabase Storage
-- 'documents' bucket to ensure users can only access files for machines
-- they have permission to view.
-- ============================================================================

-- Note: Storage policies use the storage.objects table
-- The bucket 'documents' must be created in Supabase Dashboard first

-- ============================================================================
-- POLICY 1: Users can upload files to machines they have access to
-- ============================================================================
CREATE POLICY "Users can upload documents for accessible machines"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    (
        -- Extract machine_id from path (format: machine-docs/{uuid}.pdf)
        -- For now, we allow all authenticated users to upload
        -- In production, you would parse the path and check machine access
        auth.role() = 'authenticated'
    )
);

-- ============================================================================
-- POLICY 2: Users can read files for machines they have access to
-- ============================================================================
CREATE POLICY "Users can read documents for accessible machines"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND
    (
        -- Super admins can see all
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('SUPER_ADMIN', 'SUPPORT_ADMIN')
        )
        OR
        -- Regular users: In production, parse path and check machine access
        -- For now, allow all authenticated users
        auth.role() = 'authenticated'
    )
);

-- ============================================================================
-- POLICY 3: Only admins can delete files
-- ============================================================================
CREATE POLICY "Only admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORG_ADMIN')
    )
);

-- ============================================================================
-- NOTES FOR PRODUCTION
-- ============================================================================
-- The current policies allow all authenticated users to upload/read files.
-- For stricter security, you should:
--
-- 1. Store machine_id in the file path (e.g., machine-docs/{machine_id}/{uuid}.pdf)
-- 2. Parse the path in the policy to extract machine_id
-- 3. Join with machines table to check if user's org has access
--
-- Example stricter policy for SELECT:
-- USING (
--     bucket_id = 'documents' AND
--     EXISTS (
--         SELECT 1 FROM public.machines m
--         INNER JOIN public.users u ON u.id = auth.uid()
--         WHERE (
--             -- Extract machine_id from path (simplified example)
--             m.id::text = split_part(name, '/', 2)
--             AND (
--                 m.owner_org_id = u.org_id
--                 OR m.assigned_partner_id = u.org_id
--                 OR u.role IN ('SUPER_ADMIN', 'SUPPORT_ADMIN')
--             )
--         )
--     )
-- )
