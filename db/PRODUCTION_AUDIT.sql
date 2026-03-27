-- ============================================================================
-- ENVIROJIM V6 PRODUCTION AUDIT - COMPREHENSIVE VERIFICATION SCRIPT
-- ============================================================================
-- Purpose: Systematically verify all database structures, RLS policies,
--          triggers, and security configurations for production readiness
-- ============================================================================

-- ============================================================================
-- SECTION 1: DATABASE STRUCTURE VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
    v_expected_tables TEXT[] := ARRAY[
        'organizations', 'users', 'sites', 'machines', 'parts_catalog',
        'part_requests', 'part_request_items', 'interventions', 'intervention_parts',
        'tickets', 'diagnostic_nodes', 'diagnostic_sessions', 'maintenance_definitions',
        'maintenance_rules', 'checklist_templates', 'checklists', 'rfqs',
        'supplier_quotes', 'manuals', 'email_templates', 'notification_logs',
        'documents', 'audit_logs'
    ];
    v_table TEXT;
    v_missing_tables TEXT[] := '{}';
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECTION 1: DATABASE STRUCTURE';
    RAISE NOTICE '========================================';
    
    -- Check all expected tables exist
    FOREACH v_table IN ARRAY v_expected_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = v_table
        ) THEN
            v_missing_tables := array_append(v_missing_tables, v_table);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_tables, 1) > 0 THEN
        RAISE WARNING '❌ MISSING TABLES: %', array_to_string(v_missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All % expected tables exist', array_length(v_expected_tables, 1);
    END IF;
    
    -- Count total tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    RAISE NOTICE 'Total tables in public schema: %', v_table_count;
END $$;

-- Verify ENUMs
DO $$
DECLARE
    v_enum_count INTEGER;
    v_expected_enums TEXT[] := ARRAY[
        'org_type', 'user_role', 'request_status', 'request_urgency',
        'document_type', 'ticket_status', 'ticket_priority', 'outcome_type',
        'checklist_status', 'rfq_status', 'processing_status'
    ];
    v_enum TEXT;
    v_missing_enums TEXT[] := '{}';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking ENUMs...';
    
    FOREACH v_enum IN ARRAY v_expected_enums LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = v_enum AND typtype = 'e'
        ) THEN
            v_missing_enums := array_append(v_missing_enums, v_enum);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_enums, 1) > 0 THEN
        RAISE WARNING '❌ MISSING ENUMs: %', array_to_string(v_missing_enums, ', ');
    ELSE
        RAISE NOTICE '✅ All % expected ENUMs exist', array_length(v_expected_enums, 1);
    END IF;
END $$;

-- Verify soft-delete columns
DO $$
DECLARE
    v_table TEXT;
    v_tables_with_soft_delete TEXT[] := ARRAY[
        'organizations', 'users', 'sites', 'machines', 'parts_catalog',
        'part_requests', 'interventions', 'tickets', 'diagnostic_nodes',
        'diagnostic_sessions', 'documents'
    ];
    v_missing_soft_delete TEXT[] := '{}';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking soft-delete columns...';
    
    FOREACH v_table IN ARRAY v_tables_with_soft_delete LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = v_table 
            AND column_name = 'deleted_at'
        ) THEN
            v_missing_soft_delete := array_append(v_missing_soft_delete, v_table);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_soft_delete, 1) > 0 THEN
        RAISE WARNING '❌ MISSING deleted_at: %', array_to_string(v_missing_soft_delete, ', ');
    ELSE
        RAISE NOTICE '✅ All expected tables have deleted_at column';
    END IF;
END $$;

-- Verify audit triggers
DO $$
DECLARE
    v_trigger_count INTEGER;
    v_table TEXT;
    v_tables_with_audit TEXT[] := ARRAY[
        'organizations', 'users', 'sites', 'machines', 'parts_catalog',
        'part_requests', 'part_request_items', 'interventions', 'tickets',
        'documents', 'maintenance_definitions', 'maintenance_rules',
        'checklists', 'rfqs', 'manuals'
    ];
    v_missing_triggers TEXT[] := '{}';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Checking audit triggers...';
    
    FOREACH v_table IN ARRAY v_tables_with_audit LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE event_object_schema = 'public'
            AND event_object_table = v_table
            AND trigger_name LIKE 'tr_audit_%'
        ) THEN
            v_missing_triggers := array_append(v_missing_triggers, v_table);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_triggers, 1) > 0 THEN
        RAISE WARNING '❌ MISSING audit triggers: %', array_to_string(v_missing_triggers, ', ');
    ELSE
        RAISE NOTICE '✅ All expected tables have audit triggers';
    END IF;
    
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND trigger_name LIKE 'tr_audit_%';
    
    RAISE NOTICE 'Total audit triggers: %', v_trigger_count;
END $$;

-- ============================================================================
-- SECTION 2: RLS POLICIES VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_policy_count INTEGER;
    v_table TEXT;
    v_tables_with_rls TEXT[] := ARRAY[
        'organizations', 'users', 'sites', 'machines', 'parts_catalog',
        'part_requests', 'interventions', 'intervention_parts', 'tickets',
        'diagnostic_nodes', 'diagnostic_sessions', 'documents',
        'maintenance_definitions', 'maintenance_rules', 'checklist_templates',
        'checklists', 'rfqs', 'supplier_quotes', 'manuals', 'email_templates',
        'notification_logs', 'audit_logs'
    ];
    v_missing_rls TEXT[] := '{}';
    v_rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECTION 2: RLS POLICIES';
    RAISE NOTICE '========================================';
    
    -- Check RLS is enabled on all tables
    FOREACH v_table IN ARRAY v_tables_with_rls LOOP
        SELECT relrowsecurity INTO v_rls_enabled
        FROM pg_class
        WHERE relname = v_table AND relnamespace = 'public'::regnamespace;
        
        IF NOT COALESCE(v_rls_enabled, FALSE) THEN
            v_missing_rls := array_append(v_missing_rls, v_table);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_rls, 1) > 0 THEN
        RAISE WARNING '❌ RLS NOT ENABLED: %', array_to_string(v_missing_rls, ', ');
    ELSE
        RAISE NOTICE '✅ RLS enabled on all expected tables';
    END IF;
    
    -- Count total policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Total RLS policies: %', v_policy_count;
    
    IF v_policy_count < 40 THEN
        RAISE WARNING '⚠️  Expected 44+ policies, found %', v_policy_count;
    ELSE
        RAISE NOTICE '✅ Policy count meets expectations';
    END IF;
END $$;

-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 3: SECURITY DEFINER FUNCTIONS
-- ============================================================================

DO $$
DECLARE
    v_func_count INTEGER;
    v_expected_functions TEXT[] := ARRAY[
        'is_super_admin',
        'is_admin',
        'get_auth_org_hierarchy',
        'custom_access_token_hook',
        'log_audit'
    ];
    v_func TEXT;
    v_missing_funcs TEXT[] := '{}';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECTION 3: SECURITY DEFINER FUNCTIONS';
    RAISE NOTICE '========================================';
    
    FOREACH v_func IN ARRAY v_expected_functions LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = v_func
            AND p.prosecdef = TRUE
        ) THEN
            v_missing_funcs := array_append(v_missing_funcs, v_func);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_funcs, 1) > 0 THEN
        RAISE WARNING '❌ MISSING SECURITY DEFINER functions: %', array_to_string(v_missing_funcs, ', ');
    ELSE
        RAISE NOTICE '✅ All expected SECURITY DEFINER functions exist';
    END IF;
    
    -- Count all SECURITY DEFINER functions
    SELECT COUNT(*) INTO v_func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = TRUE;
    
    RAISE NOTICE 'Total SECURITY DEFINER functions: %', v_func_count;
END $$;

-- List all SECURITY DEFINER functions
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prosecdef = TRUE
ORDER BY p.proname;

-- ============================================================================
-- SECTION 4: CRITICAL RPCs
-- ============================================================================

DO $$
DECLARE
    v_rpc_count INTEGER;
    v_expected_rpcs TEXT[] := ARRAY[
        'create_machine_with_document',
        'create_part_request_with_items',
        'update_part_request_status',
        'update_document',
        'delete_document'
    ];
    v_rpc TEXT;
    v_missing_rpcs TEXT[] := '{}';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECTION 4: CRITICAL RPCs';
    RAISE NOTICE '========================================';
    
    FOREACH v_rpc IN ARRAY v_expected_rpcs LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = v_rpc
        ) THEN
            v_missing_rpcs := array_append(v_missing_rpcs, v_rpc);
        END IF;
    END LOOP;
    
    IF array_length(v_missing_rpcs, 1) > 0 THEN
        RAISE WARNING '❌ MISSING RPCs: %', array_to_string(v_missing_rpcs, ', ');
    ELSE
        RAISE NOTICE '✅ All expected RPCs exist';
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: DATA INTEGRITY
-- ============================================================================

DO $$
DECLARE
    v_org_count INTEGER;
    v_user_count INTEGER;
    v_machine_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECTION 5: DATA INTEGRITY';
    RAISE NOTICE '========================================';
    
    -- Count organizations
    SELECT COUNT(*) INTO v_org_count FROM public.organizations WHERE deleted_at IS NULL;
    RAISE NOTICE 'Active organizations: %', v_org_count;
    
    -- Count users
    SELECT COUNT(*) INTO v_user_count FROM public.users WHERE deleted_at IS NULL;
    RAISE NOTICE 'Active users: %', v_user_count;
    
    -- Count machines
    SELECT COUNT(*) INTO v_machine_count FROM public.machines WHERE deleted_at IS NULL;
    RAISE NOTICE 'Active machines: %', v_machine_count;
    
    -- Verify referential integrity
    IF EXISTS (
        SELECT 1 FROM public.users u
        LEFT JOIN public.organizations o ON u.organization_id = o.id
        WHERE o.id IS NULL
    ) THEN
        RAISE WARNING '❌ ORPHANED USERS: Users exist without valid organization';
    ELSE
        RAISE NOTICE '✅ All users have valid organization references';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM public.machines m
        LEFT JOIN public.organizations o ON m.organization_id = o.id
        WHERE o.id IS NULL
    ) THEN
        RAISE WARNING '❌ ORPHANED MACHINES: Machines exist without valid organization';
    ELSE
        RAISE NOTICE '✅ All machines have valid organization references';
    END IF;
END $$;

-- ============================================================================
-- SECTION 6: AUDIT LOG VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_audit_count INTEGER;
    v_recent_audits INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SECTION 6: AUDIT LOGS';
    RAISE NOTICE '========================================';
    
    -- Count total audit logs
    SELECT COUNT(*) INTO v_audit_count FROM public.audit_logs;
    RAISE NOTICE 'Total audit log entries: %', v_audit_count;
    
    -- Count recent audit logs (last 24 hours)
    SELECT COUNT(*) INTO v_recent_audits 
    FROM public.audit_logs
    WHERE changed_at > NOW() - INTERVAL '24 hours';
    RAISE NOTICE 'Audit logs (last 24h): %', v_recent_audits;
    
    -- Verify audit_logs table is immutable
    IF EXISTS (
        SELECT 1 FROM information_schema.table_privileges
        WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
        AND privilege_type IN ('UPDATE', 'DELETE')
        AND grantee IN ('public', 'authenticated')
    ) THEN
        RAISE WARNING '❌ SECURITY ISSUE: audit_logs allows UPDATE/DELETE';
    ELSE
        RAISE NOTICE '✅ audit_logs is properly protected (no UPDATE/DELETE)';
    END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE AUDIT COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review all ✅ and ❌ messages above';
    RAISE NOTICE 'Next: Test RLS policies with actual user sessions';
    RAISE NOTICE 'Next: Test JWT authentication flow';
    RAISE NOTICE 'Next: Test frontend workflows';
    RAISE NOTICE '========================================';
END $$;
