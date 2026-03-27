-- ============================================================================
-- DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify schema and data
-- ============================================================================

-- 1. VERIFY ALL TABLES EXIST
-- ============================================================================
SELECT 
    'Tables Created' as check_name,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 8 THEN '✅ PASS'
        ELSE '❌ FAIL - Expected 8 tables'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- 2. VERIFY TABLE ROW COUNTS
-- ============================================================================
SELECT 'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'machines', COUNT(*) FROM machines
UNION ALL SELECT 'diagnostic_nodes', COUNT(*) FROM diagnostic_nodes
UNION ALL SELECT 'part_requests', COUNT(*) FROM part_requests
UNION ALL SELECT 'part_request_items', COUNT(*) FROM part_request_items
UNION ALL SELECT 'interventions', COUNT(*) FROM interventions
UNION ALL SELECT 'diagnostic_sessions', COUNT(*) FROM diagnostic_sessions
ORDER BY table_name;

-- Expected Results:
-- organizations: 3
-- users: 6
-- machines: 5
-- diagnostic_nodes: 9
-- part_requests: 3
-- part_request_items: 5
-- interventions: 2
-- diagnostic_sessions: 1

-- 3. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4. VERIFY INDEXES
-- ============================================================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. VERIFY RLS POLICIES ARE ENABLED
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. VERIFY ENUM TYPES
-- ============================================================================
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN (
    'organization_type',
    'user_role',
    'part_request_status',
    'urgency_level',
    'outcome_type'
)
ORDER BY t.typname, e.enumsortorder;

-- 7. TEST FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Users belong to organizations
SELECT 
    u.full_name,
    u.role,
    o.name as organization,
    o.type as org_type
FROM users u
JOIN organizations o ON u.org_id = o.id
ORDER BY o.name, u.full_name;

-- Machines with owners and assigned partners
SELECT 
    m.serial_number,
    m.make,
    m.model,
    owner.name as owner_org,
    partner.name as service_partner
FROM machines m
JOIN organizations owner ON m.owner_org_id = owner.id
LEFT JOIN organizations partner ON m.assigned_partner_id = partner.id
ORDER BY m.serial_number;

-- Part requests with machine and requester details
SELECT 
    pr.id,
    pr.status,
    pr.urgency_level,
    m.serial_number as machine,
    u.full_name as requester,
    COUNT(pri.id) as item_count
FROM part_requests pr
JOIN machines m ON pr.machine_id = m.id
JOIN users u ON pr.requester_user_id = u.id
LEFT JOIN part_request_items pri ON pr.id = pri.part_request_id
GROUP BY pr.id, pr.status, pr.urgency_level, m.serial_number, u.full_name
ORDER BY pr.created_at;

-- 8. VERIFY DIAGNOSTIC TREE STRUCTURE
-- ============================================================================

-- Root nodes (no parent)
SELECT 
    id,
    question_text,
    is_leaf,
    outcome_type
FROM diagnostic_nodes
WHERE parent_node_id IS NULL;

-- Verify tree integrity - all referenced nodes exist
SELECT 
    dn.id,
    dn.question_text,
    dn.parent_node_id,
    parent.question_text as parent_question
FROM diagnostic_nodes dn
LEFT JOIN diagnostic_nodes parent ON dn.parent_node_id = parent.id
ORDER BY dn.id;

-- Check for orphaned nodes (except root)
SELECT 
    id,
    question_text,
    parent_node_id
FROM diagnostic_nodes
WHERE parent_node_id IS NOT NULL
AND parent_node_id NOT IN (SELECT id FROM diagnostic_nodes);

-- 9. VERIFY JSONB DATA INTEGRITY
-- ============================================================================

-- Check diagnostic node options structure
SELECT 
    id,
    question_text,
    jsonb_array_length(options) as option_count,
    options
FROM diagnostic_nodes
WHERE NOT is_leaf
ORDER BY id;

-- Check diagnostic session paths
SELECT 
    id,
    user_id,
    machine_id,
    jsonb_array_length(path) as path_length,
    path,
    outcome
FROM diagnostic_sessions
ORDER BY created_at DESC;

-- 10. VERIFY DATA CONSTRAINTS
-- ============================================================================

-- Check for invalid email formats
SELECT 
    id,
    email,
    full_name
FROM users
WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- Check for negative values in part pricing
SELECT 
    part_request_id,
    part_name,
    quantity,
    base_cost_cad,
    margin_percent,
    final_price_cad
FROM part_request_items
WHERE quantity <= 0 
   OR base_cost_cad < 0 
   OR margin_percent < 0 
   OR final_price_cad < 0;

-- Check for invalid machine hours
SELECT 
    id,
    serial_number,
    current_hours
FROM machines
WHERE current_hours < 0;

-- 11. VERIFY TIMESTAMPS
-- ============================================================================

-- Check that all created_at timestamps are set
SELECT 
    'organizations' as table_name,
    COUNT(*) as total_rows,
    COUNT(created_at) as rows_with_timestamp,
    CASE 
        WHEN COUNT(*) = COUNT(created_at) THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as status
FROM organizations
UNION ALL
SELECT 'users', COUNT(*), COUNT(created_at),
    CASE WHEN COUNT(*) = COUNT(created_at) THEN '✅ PASS' ELSE '❌ FAIL' END
FROM users
UNION ALL
SELECT 'machines', COUNT(*), COUNT(created_at),
    CASE WHEN COUNT(*) = COUNT(created_at) THEN '✅ PASS' ELSE '❌ FAIL' END
FROM machines
UNION ALL
SELECT 'part_requests', COUNT(*), COUNT(created_at),
    CASE WHEN COUNT(*) = COUNT(created_at) THEN '✅ PASS' ELSE '❌ FAIL' END
FROM part_requests;

-- 12. VERIFY UNIQUE CONSTRAINTS
-- ============================================================================

-- Check for duplicate user emails
SELECT 
    email,
    COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for duplicate machine serial numbers
SELECT 
    serial_number,
    COUNT(*) as count
FROM machines
GROUP BY serial_number
HAVING COUNT(*) > 1;

-- 13. SUMMARY REPORT
-- ============================================================================
SELECT 
    '=== DATABASE VERIFICATION SUMMARY ===' as report;

SELECT 
    'Total Organizations' as metric,
    COUNT(*)::text as value
FROM organizations
UNION ALL
SELECT 'Total Users', COUNT(*)::text FROM users
UNION ALL
SELECT 'Total Machines', COUNT(*)::text FROM machines
UNION ALL
SELECT 'Total Diagnostic Nodes', COUNT(*)::text FROM diagnostic_nodes
UNION ALL
SELECT 'Total Part Requests', COUNT(*)::text FROM part_requests
UNION ALL
SELECT 'Total Part Request Items', COUNT(*)::text FROM part_request_items
UNION ALL
SELECT 'Total Interventions', COUNT(*)::text FROM interventions
UNION ALL
SELECT 'Total Diagnostic Sessions', COUNT(*)::text FROM diagnostic_sessions;

-- Final validation
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM organizations) = 3
        AND (SELECT COUNT(*) FROM users) = 6
        AND (SELECT COUNT(*) FROM machines) = 5
        AND (SELECT COUNT(*) FROM diagnostic_nodes) = 9
        AND (SELECT COUNT(*) FROM part_requests) = 3
        AND (SELECT COUNT(*) FROM part_request_items) = 5
        AND (SELECT COUNT(*) FROM interventions) = 2
        AND (SELECT COUNT(*) FROM diagnostic_sessions) = 1
        THEN '✅ DATABASE VERIFICATION PASSED - All data loaded correctly'
        ELSE '❌ DATABASE VERIFICATION FAILED - Data counts do not match expected values'
    END as final_status;
