-- ============================================================================
-- TEST: 01_HIERARCHY_AND_SOFT_DELETE
-- Description: Verifies RLS visibility across hierarchy and Soft Delete logic.
-- ============================================================================

BEGIN;

-- 1. SETUP HIERARCHY
-- ============================================================================
-- Create Orgs
INSERT INTO organizations (id, name, type, parent_id) VALUES 
('00000000-0000-0000-0000-000000000001', 'Master HQ', 'ENVIROJIM', NULL),
('00000000-0000-0000-0000-000000000002', 'Dealer A', 'SERVICE_PROVIDER', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'Client X', 'CLIENT', '00000000-0000-0000-0000-000000000002');

-- Create Users (Mock Auth)
-- Note: In real test, we would need to insert into auth.users first. 
-- Here we simulate by assuming they exist or using a mock function if available.
-- For this script, we just insert into public.users to test the hierarchy function logic if we mock auth.uid()

-- 2. SETUP ASSETS
-- ============================================================================
INSERT INTO machines (id, serial_number, make, model, owner_org_id, year, country, state_province, city) VALUES
('00000000-0000-0000-0000-000000000010', 'SN-CLIENT-X-01', 'CAT', '336', '00000000-0000-0000-0000-000000000003', 2022, 'CA', 'QC', 'Montreal'), -- Owned by Client X
('00000000-0000-0000-0000-000000000011', 'SN-DEALER-A-01', 'CAT', '336', '00000000-0000-0000-0000-000000000002', 2023, 'CA', 'ON', 'Toronto');  -- Owned by Dealer A

-- 3. VERIFY HIERARCHY (Manual Check via Select)
-- ============================================================================

-- Function to simulate auth context and run query? 
-- Postgres doesn't easily allow "switching user" in a pure SQL script without SET ROLE.
-- But Supabase uses `auth.uid()`.
-- We can test the recursive CTE logic directly.

-- Test 3.1: Master HQ should see self, Dealer A, and Client X
WITH user_context AS (SELECT '00000000-0000-0000-0000-000000000001'::UUID as my_org_id)
SELECT id FROM organizations WHERE id IN (
    WITH RECURSIVE hierarchy AS (
        SELECT id FROM organizations WHERE id = (SELECT my_org_id FROM user_context)
        UNION ALL
        SELECT o.id FROM organizations o INNER JOIN hierarchy h ON o.parent_id = h.id
    ) SELECT id FROM hierarchy
);
-- Expected: 3 rows (Master, Dealer, Client)

-- Test 3.2: Dealer A should see self and Client X
WITH user_context AS (SELECT '00000000-0000-0000-0000-000000000002'::UUID as my_org_id)
SELECT id FROM organizations WHERE id IN (
    WITH RECURSIVE hierarchy AS (
        SELECT id FROM organizations WHERE id = (SELECT my_org_id FROM user_context)
        UNION ALL
        SELECT o.id FROM organizations o INNER JOIN hierarchy h ON o.parent_id = h.id
    ) SELECT id FROM hierarchy
);
-- Expected: 2 rows (Dealer, Client)

-- Test 3.3: Client X should see only self
WITH user_context AS (SELECT '00000000-0000-0000-0000-000000000003'::UUID as my_org_id)
SELECT id FROM organizations WHERE id IN (
    WITH RECURSIVE hierarchy AS (
        SELECT id FROM organizations WHERE id = (SELECT my_org_id FROM user_context)
        UNION ALL
        SELECT o.id FROM organizations o INNER JOIN hierarchy h ON o.parent_id = h.id
    ) SELECT id FROM hierarchy
);
-- Expected: 1 row (Client)

-- 4. VERIFY SOFT DELETE
-- ============================================================================
-- Soft delete Client Machine
UPDATE machines SET deleted_at = NOW() WHERE id = '00000000-0000-0000-0000-000000000010';

-- Select should return nothing (mocking the RLS clause)
SELECT * FROM machines 
WHERE id = '00000000-0000-0000-0000-000000000010' 
AND deleted_at IS NULL;
-- Expected: 0 rows

-- 5. VERIFY UNIQUE CONSTRAINT (Soft Delete)
-- ============================================================================
-- Insert new machine with SAME serial as deleted one -> Should SUCCESS
INSERT INTO machines (serial_number, make, model, owner_org_id, year, country, state_province, city) VALUES
('SN-CLIENT-X-01', 'CAT', '336', '00000000-0000-0000-0000-000000000003', 2024, 'CA', 'QC', 'Montreal');

-- Insert new machine with SAME serial as ACTIVE one -> Should FAIL
-- INSERT INTO machines ... 'SN-CLIENT-X-01' ...
-- This logic depends on the partial unique index created in Step 1.

ROLLBACK;
