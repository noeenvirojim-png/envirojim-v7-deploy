-- ============================================================================
-- ENVIROJIM V6 ENTERPRISE - PROFESSIONAL SEED DATA
-- ============================================================================

-- 1. ORGANIZATIONS (HQ, SERVICE PROVIDER, CLIENT)
-- ============================================================================
INSERT INTO public.organizations (id, name, type, parent_id) VALUES
('00000000-0000-0000-0000-000000000001', 'EnviroJim HQ', 'ENVIROJIM', NULL),
('00000000-0000-0000-0000-000000000002', 'Northern Service Partners', 'SERVICE_PROVIDER', '00000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000003', 'Acme Mining Corp', 'CLIENT', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;

-- 2. SITES
-- ============================================================================
INSERT INTO public.sites (id, organization_id, name) VALUES
('81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', 'Acme North Pit'),
('82222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000003', 'Acme South Cave')
ON CONFLICT (id) DO NOTHING;

-- 3. USERS (Roles matching Enum)
-- ============================================================================
INSERT INTO public.users (id, organization_id, role, email, full_name) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'noe@envirojim.com', 'Noe Admin'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'ENVIROJIM_ADMIN', 'parts@envirojim.com', 'Support Specialist'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'CLIENT_ADMIN', 'manager@acmemining.com', 'Mike Manager'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000003', 'OPERATOR', 'operator@acmemining.com', 'Tom Operator'),
('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000002', 'CLIENT_ADMIN', 'admin@northernsp.com', 'Nancy Admin'),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000002', 'TECHNICIAN', 'tech@northernsp.com', 'Terry Technician')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = EXCLUDED.role, full_name = EXCLUDED.full_name;

-- 4. PARTS CATALOG
-- ============================================================================
INSERT INTO public.parts_catalog (id, part_number, name, description, price) VALUES
('a1111111-1111-1111-1111-111111111111', 'EJ-FLT-001', 'Hydraulic Filter', 'High-flow hydraulic filter', 45.00),
('a2222222-2222-2222-2222-222222222222', 'EJ-FLT-002', 'Air Filter', 'Heavy-duty air filter', 32.50),
('a3333333-3333-3333-3333-333333333333', 'EJ-BRG-001', 'Bearing Assembly', 'Main shaft bearing assembly', 125.00),
('a4444444-4444-4444-4444-444444444444', 'EJ-SEAL-001', 'Hydraulic Seal Kit', 'Complete seal kit', 78.00)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;

-- 5. MACHINES
-- ============================================================================
INSERT INTO public.machines (id, organization_id, site_id, assigned_partner_id, serial_number, make, model, year, current_hours) VALUES
('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000003', '81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'CAT-320-001', 'Caterpillar', '320D', 2020, 1500),
('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000003', '82222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'KOM-850-002', 'Komatsu', 'PC850', 2021, 800)
ON CONFLICT (id) DO NOTHING;

-- 6. DIAGNOSTIC TREE
-- ============================================================================
-- Root Node
INSERT INTO public.diagnostic_nodes (id, parent_node_id, question_text, is_leaf, options) VALUES
('c1111111-1111-1111-1111-111111111111', NULL, 'What type of issue are you experiencing?', false, 
'[{"label": "Hydraulic System", "target_node_id": "c2222222-2222-2222-2222-222222222222"}, {"label": "Engine System", "target_node_id": "c3333333-3333-3333-3333-333333333333"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Hydraulic Node
INSERT INTO public.diagnostic_nodes (id, parent_node_id, question_text, is_leaf, options) VALUES
('c2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Is there visible fluid leakage?', false,
'[{"label": "Yes", "target_node_id": "c4444444-4444-4444-4444-444444444444"}, {"label": "No", "target_node_id": "c5555555-5555-5555-5555-555555555555"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Outcome Node
INSERT INTO public.diagnostic_nodes (id, parent_node_id, question_text, is_leaf, outcome_type) VALUES
('c4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'Check hydraulic seals. Replacement needed.', true, 'REPAIR_NEEDED')
ON CONFLICT (id) DO NOTHING;

-- 7. CHECKLIST TEMPLATES
-- ============================================================================
INSERT INTO public.checklist_templates (id, organization_id, machine_id, name, items) VALUES
('aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000003', 'b1111111-1111-1111-1111-111111111111', 'Daily Walkaround', 
'[{"label": "Check fluid levels", "required": true}, {"label": "Inspect tires/tracks", "required": true}, {"label": "Verify lights", "required": false}]'::jsonb)
ON CONFLICT (id) DO NOTHING;
