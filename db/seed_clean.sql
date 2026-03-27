-- ============================================================================
-- CLEAN SEED DATA FOR FRESH SUPABASE PROJECT
-- ============================================================================
-- Execute AFTER schema.sql
-- This version ONLY seeds organizations and parts catalog
-- Users will be created via application code

-- 1. ORGANIZATIONS
-- ============================================================================
INSERT INTO organizations (id, name, type, qb_customer_id, settings) VALUES
('00000000-0000-0000-0000-000000000001', 'EnviroJim', 'ENVIROJIM', NULL, '{"require_po": false}'::jsonb),
('00000000-0000-0000-0000-000000000002', 'ACME Mining Corp', 'CLIENT', 'QB-ACME-001', '{"require_po": true}'::jsonb),
('00000000-0000-0000-0000-000000000003', 'Northern Service Partners', 'SERVICE_PROVIDER', 'QB-NSP-001', '{"require_po": false}'::jsonb);

-- 2. PARTS CATALOG (Sample)
-- ============================================================================
INSERT INTO parts_catalog (part_number, name, description, base_cost_cad) VALUES
('EJ-FLT-001', 'Hydraulic Filter', 'High-flow hydraulic filter for heavy equipment', 45.00),
('EJ-FLT-002', 'Air Filter', 'Heavy-duty air filter', 32.50),
('EJ-BRG-001', 'Bearing Assembly', 'Main shaft bearing assembly', 125.00),
('EJ-SEAL-001', 'Hydraulic Seal Kit', 'Complete seal kit for hydraulic cylinders', 78.00);

-- 3. DIAGNOSTIC TREE (Sample)
-- ============================================================================
WITH root_node AS (
  INSERT INTO diagnostic_nodes (id, machine_model, question_text, is_leaf) 
  VALUES ('d0000000-0000-0000-0000-000000000001', NULL, 'What type of issue are you experiencing?', false)
  RETURNING id
),
hydraulic_node AS (
  INSERT INTO diagnostic_nodes (id, question_text, is_leaf)
  VALUES ('d0000000-0000-0000-0000-000000000002', 'Is there visible fluid leakage?', false)
  RETURNING id
),
leak_solution AS (
  INSERT INTO diagnostic_nodes (id, question_text, is_leaf, outcome_type, outcome_text)
  VALUES ('d0000000-0000-0000-0000-000000000003', 'Check hydraulic seals', true, 'ORDER_PART', 'Order seal kit EJ-SEAL-001')
  RETURNING id
)
INSERT INTO diagnostic_options (source_node_id, label, target_node_id)
SELECT 
  (SELECT id FROM root_node),
  'Hydraulic System',
  (SELECT id FROM hydraulic_node)
UNION ALL
SELECT 
  (SELECT id FROM hydraulic_node),
  'Yes',
  (SELECT id FROM leak_solution);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Organizations' as table_name, count(*) as count FROM organizations
UNION ALL
SELECT 'Parts Catalog', count(*) FROM parts_catalog
UNION ALL
SELECT 'Diagnostic Nodes', count(*) FROM diagnostic_nodes;
