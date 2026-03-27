-- ============================================================================
-- EnviroJim Platform - Professional Seed Data
-- ============================================================================

-- 1. ORGANIZATIONS
-- ============================================================================
INSERT INTO organizations (id, name, type, qb_customer_id) VALUES
('00000000-0000-0000-0000-000000000001', 'EnviroJim HQ', 'ENVIROJIM', 'QB-EJ-001'),
('00000000-0000-0000-0000-000000000002', 'Acme Mining Corp', 'CLIENT', 'QB-ACME-001'),
('00000000-0000-0000-0000-000000000003', 'Northern Service Partners', 'SERVICE_PROVIDER', 'QB-NSP-001')
ON CONFLICT (id) DO NOTHING;

-- 2. USERS (Match Supabase Auth IDs)
-- ============================================================================
INSERT INTO users (id, org_id, role, email, full_name, is_active) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'noe@envirojim.com', 'Noe Admin', true),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000002', 'ORG_ADMIN', 'manager@acmemining.com', 'Mike Manager', true),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000003', 'TECHNICIAN', 'tech@northernsp.com', 'Terry Technician', true)
ON CONFLICT (id) DO NOTHING;

-- 3. PARTS CATALOG
-- ============================================================================
INSERT INTO parts_catalog (id, part_number, name, base_cost_cad) VALUES
('f0000000-0000-0000-0000-000000000001', 'HF-12345', 'Hydraulic Filter', 45.00),
('f0000000-0000-0000-0000-000000000002', 'EOF-67890', 'Engine Oil Filter', 28.00),
('f0000000-0000-0000-0000-000000000003', 'SM-KOMATSU-850', 'Starter Motor Assembly', 850.00)
ON CONFLICT (id) DO NOTHING;

-- 4. MACHINES
-- ============================================================================
INSERT INTO machines (id, owner_org_id, serial_number, make, model, year, country, state_province, city, engine_make, engine_serial) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000002', 'CAT-320D-12345', 'Caterpillar', '320D', 2018, 'Canada', 'Ontario', 'Sudbury', 'Cat C7.1', 'ENG-CAT-789')
ON CONFLICT (id) DO NOTHING;

-- 5. DIAGNOSTIC TREE (Relational)
-- ============================================================================

-- Nodes
INSERT INTO diagnostic_nodes (id, question_text, is_leaf) VALUES
('e0000000-0000-0000-0000-000000000001', 'What type of issue is it?', false),
('e0000000-0000-0000-0000-000000000002', 'Engine Issue', false),
('e0000000-0000-0000-0000-000000000003', 'Hydraulic Issue', false),
('e0000000-0000-0000-0000-000000000004', 'Battery low. Charge it.', true)
ON CONFLICT (id) DO NOTHING;

-- Options (The Links)
INSERT INTO diagnostic_options (source_node_id, label, target_node_id) VALUES
('e0000000-0000-0000-0000-000000000001', 'Engine', 'e0000000-0000-0000-0000-000000000002'),
('e0000000-0000-0000-0000-000000000001', 'Hydraulics', 'e0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000002', 'Won''t start', 'e0000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- 6. SAMPLE TRANSACTIONS
-- ============================================================================

-- Part Request
INSERT INTO part_requests (id, machine_id, requester_user_id, status) VALUES
('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'DRAFT')
ON CONFLICT (id) DO NOTHING;

-- Request Items (Applying Current Cost from Catalog)
INSERT INTO part_request_items (part_request_id, part_id, quantity, applied_cost_cad) 
SELECT 'd0000000-0000-0000-0000-000000000001', id, 2, base_cost_cad 
FROM parts_catalog WHERE part_number = 'HF-12345'
ON CONFLICT DO NOTHING;
