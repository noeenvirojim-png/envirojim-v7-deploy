-- ====================================================================
-- ENVIRONMENT: Automated Verification for V6 Golden Master
-- ====================================================================

-- 1. Setup: Test Users & Orgs
-- ====================================================================
INSERT INTO public.organizations (id, name, type)
VALUES ('11111111-1111-1111-1111-111111111111', 'Client Org', 'CLIENT')
ON CONFLICT DO NOTHING;

INSERT INTO public.users (id, organization_id, role, email, full_name)
VALUES 
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ORG_ADMIN', 'admin@client.com', 'Client Admin'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'OPERATOR', 'tech@client.com', 'Technician')
ON CONFLICT DO NOTHING;

-- 2. Test RLS Enforcement
-- ====================================================================
-- We mock the user ID to the technician in Step 1 to test RLS
-- Technician = '22222222-2222-2222-2222-222222222222'
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
SET ROLE authenticated; -- Force RLS evaluation

-- Attempt to SELECT from another org (should fail for non-admin)
-- HQ Org ID = '00000000-0000-0000-0000-000000000001'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000001') THEN
        RAISE NOTICE 'RLS bypass detected: FAILURE (Non-admin sees other org)';
    ELSE
        RAISE NOTICE 'RLS enforced properly: PASS (Non-admin cannot see other org)';
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'RLS enforcement error: %', SQLERRM;
END $$;

RESET ROLE; -- Back to postgres for RPC tests that use SECURITY DEFINER

-- 3. Test RPC: create_machine_with_document
-- ====================================================================

-- We mock the user ID to the admin for RPC tests
-- Admin = '11111111-1111-1111-1111-111111111111'
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := public.create_machine_with_document(
        '{"organization_id":"11111111-1111-1111-1111-111111111111","serial_number":"TEST123","make":"Caterpillar","model":"D6","year":2023}'::JSONB,
        '{"title":"Manual","type":"MANUAL","file_url":"https://example.com/manual.pdf"}'::JSONB
    );
    RAISE NOTICE 'RPC create_machine_with_document PASS: %', v_result;
END $$;

-- 4. Test RPC: create_part_request_with_items
-- ====================================================================
DO $$
DECLARE
    v_request JSONB;
BEGIN
    -- Note: This requires the machine created in step 3 to have ID '11111111-1111-1111-1111-111111111111' 
    -- but create_machine_with_document generates a new UUID.
    -- Let's fetch the ID correctly.
    v_request := public.create_part_request_with_items(
        jsonb_build_object(
            'organization_id', '11111111-1111-1111-1111-111111111111',
            'machine_id', (SELECT id FROM public.machines WHERE serial_number='TEST123' LIMIT 1),
            'urgency', 'NORMAL'
        ),
        '[{"part_catalog_id":null,"part_number":"P-001","part_name":"Filter","quantity":1,"price":50}]'::JSONB
    );
    RAISE NOTICE 'RPC create_part_request_with_items PASS: %', v_request;
END $$;

-- 5. Test Soft Delete
-- ====================================================================
UPDATE public.machines SET deleted_at = NOW() WHERE serial_number='TEST123';
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.v_active_machines WHERE serial_number='TEST123') THEN
        RAISE NOTICE 'Soft Delete failed: FAILURE (Record still visible in view)';
    ELSE
        RAISE NOTICE 'Soft Delete enforced in views: PASS';
    END IF;
END $$;

-- 6. Verify Audit Logs
-- ====================================================================
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.audit_logs 
    WHERE table_name='machines' AND (old_data IS NOT NULL OR new_data IS NOT NULL);
    IF v_count > 0 THEN
        RAISE NOTICE 'Audit Trigger Logging: PASS (% records logged)', v_count;
    ELSE
        RAISE NOTICE 'Audit Trigger Logging: FAILURE';
    END IF;
END $$;

-- 7. Clean up test data (optional)
DELETE FROM public.part_request_items WHERE request_id IN (SELECT id FROM public.part_requests WHERE organization_id='11111111-1111-1111-1111-111111111111');
DELETE FROM public.part_requests WHERE organization_id='11111111-1111-1111-1111-111111111111';
DELETE FROM public.documents WHERE organization_id='11111111-1111-1111-1111-111111111111';
DELETE FROM public.machines WHERE organization_id='11111111-1111-1111-1111-111111111111';
DELETE FROM public.users WHERE email IN ('admin@client.com','tech@client.com');
DELETE FROM public.organizations WHERE id='11111111-1111-1111-1111-111111111111';
