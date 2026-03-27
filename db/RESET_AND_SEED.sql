-- ============================================================================
-- ENVIROJIM: ULTIMATE RESET & SEED SCRIPT (THE "NUCLEAR" OPTION)
-- ============================================================================
-- OBJECTIVE: Fix "Invalid Login" and "Foreign Key" errors by wiping corrupted data
-- and rebuilding a clean, synchronized state between Auth and Public tables.
-- ============================================================================

-- 0. ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CLEANUP (WIPE EVERYTHING SAFELY)
-- We use TRUNCATE CASCADE to automatically remove dependent data (tickets, machines, etc.)
-- This fixes the "violates foreign key constraint" errors you saw.

TRUNCATE TABLE 
    public.part_request_items,
    public.part_requests, 
    public.tickets, 
    public.diagnostic_options,
    public.diagnostic_nodes,
    public.machines, 
    public.users, 
    public.organizations 
    RESTART IDENTITY CASCADE;

-- Delete Auth Users (Now safe because Public Users are gone)
DELETE FROM auth.users WHERE email IN (
  'noe@envirojim.com', 'parts@envirojim.com', 
  'manager@acmemining.com', 'operator@acmemining.com', 
  'admin@northernsp.com', 'tech@northernsp.com'
);

-- 2. RE-CREATE AUTH USERS (The "Real" Accounts)
-- Password is hardcoded to: EnviroJim2024!

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
VALUES 
-- Admin (Noe)
(
    '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'noe@envirojim.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Noe Admin"}', 'authenticated', 'authenticated'
),
-- Parts Support
(
    '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'parts@envirojim.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Parts Support"}', 'authenticated', 'authenticated'
),
-- Client Manager
(
    '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'manager@acmemining.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Mike Manager"}', 'authenticated', 'authenticated'
),
-- Client Operator
(
    '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'operator@acmemining.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Tom Operator"}', 'authenticated', 'authenticated'
),
-- Service Provider Admin
(
    '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'admin@northernsp.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Nancy Admin"}', 'authenticated', 'authenticated'
),
-- Service Provider Tech
(
    '66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'tech@northernsp.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Terry Technician"}', 'authenticated', 'authenticated'
);

-- 3. RE-SEED DATA (Organizations, Users, Machines, etc.)
-- ============================================================================

-- Organizations
INSERT INTO organizations (id, name, type, qb_customer_id) VALUES
('00000000-0000-0000-0000-000000000001', 'EnviroJim HQ', 'ENVIROJIM', 'QB-EJ-001'),
('00000000-0000-0000-0000-000000000002', 'Acme Mining Corp', 'CLIENT', 'QB-ACME-001'),
('00000000-0000-0000-0000-000000000003', 'Northern Service Partners', 'SERVICE_PROVIDER', 'QB-NSP-001');

-- Users (Linked to Auth IDs)
INSERT INTO users (id, org_id, role, email, full_name, is_active) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'noe@envirojim.com', 'Noe Admin', true),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000002', 'ORG_ADMIN', 'manager@acmemining.com', 'Mike Manager', true),
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000003', 'TECHNICIAN', 'tech@northernsp.com', 'Terry Technician', true);

-- Parts Catalog
INSERT INTO parts_catalog (id, part_number, name, base_cost_cad) VALUES
('f0000000-0000-0000-0000-000000000001', 'HF-12345', 'Hydraulic Filter', 45.00),
('f0000000-0000-0000-0000-000000000002', 'EOF-67890', 'Engine Oil Filter', 28.00),
('f0000000-0000-0000-0000-000000000003', 'SM-KOMATSU-850', 'Starter Motor Assembly', 850.00);

-- Machines
INSERT INTO machines (id, owner_org_id, serial_number, make, model, year, country, state_province, city, engine_make, engine_serial) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000002', 'CAT-320D-12345', 'Caterpillar', '320D', 2018, 'Canada', 'Ontario', 'Sudbury', 'Cat C7.1', 'ENG-CAT-789');

-- Diagnostic Tree
INSERT INTO diagnostic_nodes (id, question_text, is_leaf) VALUES
('e0000000-0000-0000-0000-000000000001', 'What type of issue is it?', false),
('e0000000-0000-0000-0000-000000000002', 'Engine Issue', false),
('e0000000-0000-0000-0000-000000000003', 'Hydraulic Issue', false),
('e0000000-0000-0000-0000-000000000004', 'Battery low. Charge it.', true);

INSERT INTO diagnostic_options (source_node_id, label, target_node_id) VALUES
('e0000000-0000-0000-0000-000000000001', 'Engine', 'e0000000-0000-0000-0000-000000000002'),
('e0000000-0000-0000-0000-000000000001', 'Hydraulics', 'e0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000002', 'Won''t start', 'e0000000-0000-0000-0000-000000000004');

-- Sample Part Request
INSERT INTO part_requests (id, machine_id, requester_user_id, status) VALUES
('d0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'DRAFT');

INSERT INTO part_request_items (part_request_id, part_id, quantity, applied_cost_cad) 
SELECT 'd0000000-0000-0000-0000-000000000001', id, 2, base_cost_cad 
FROM parts_catalog WHERE part_number = 'HF-12345';
