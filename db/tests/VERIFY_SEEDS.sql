-- ============================================================================
-- VERIFY SEEDS - Post-Deployment Validation
-- ============================================================================
-- Exécuter APRÈS DEPLOY_V6_PRODUCTION_ULTIMATE.sql
-- Vérifie que les seeds sont corrects pour login immédiat
-- ============================================================================

-- I. VÉRIFIER ORGANISATION HQ
-- ============================================================================
DO $$
DECLARE
    v_org_count INTEGER;
    v_org_type TEXT;
BEGIN
    SELECT COUNT(*), MAX(type::TEXT) INTO v_org_count, v_org_type
    FROM public.organizations
    WHERE id = '00000000-0000-0000-0000-000000000001';
    
    IF v_org_count = 0 THEN
        RAISE EXCEPTION '❌ SEED FAILED: EnviroJim HQ organization not found';
    END IF;
    
    IF v_org_type != 'ENVIROJIM' THEN
        RAISE EXCEPTION '❌ SEED FAILED: HQ org type is % instead of ENVIROJIM', v_org_type;
    END IF;
    
    RAISE NOTICE '✅ Organization HQ: OK (id: 00000000-0000-0000-0000-000000000001, type: ENVIROJIM)';
END $$;

-- II. VÉRIFIER USERS SEEDS
-- ============================================================================
DO $$
DECLARE
    v_noe_count INTEGER;
    v_alex_count INTEGER;
    v_noe_role TEXT;
    v_alex_role TEXT;
BEGIN
    -- Vérifier Noé EVE
    SELECT COUNT(*), MAX(role::TEXT) INTO v_noe_count, v_noe_role
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-000000000001'
    AND email = 'noe@envirojim.com';
    
    IF v_noe_count = 0 THEN
        RAISE EXCEPTION '❌ SEED FAILED: Noé EVE not found in public.users';
    END IF;
    
    IF v_noe_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION '❌ SEED FAILED: Noé role is % instead of SUPER_ADMIN', v_noe_role;
    END IF;
    
    -- Vérifier Alexandre Paré
    SELECT COUNT(*), MAX(role::TEXT) INTO v_alex_count, v_alex_role
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-000000000002'
    AND email = 'parts@envirojim.com';
    
    IF v_alex_count = 0 THEN
        RAISE EXCEPTION '❌ SEED FAILED: Alexandre Paré not found in public.users';
    END IF;
    
    IF v_alex_role != 'ENVIROJIM_ADMIN' THEN
        RAISE EXCEPTION '❌ SEED FAILED: Alexandre role is % instead of ENVIROJIM_ADMIN', v_alex_role;
    END IF;
    
    RAISE NOTICE '✅ User Seeds: OK';
    RAISE NOTICE '  - Noé EVE: SUPER_ADMIN';
    RAISE NOTICE '  - Alexandre Paré: ENVIROJIM_ADMIN';
END $$;

-- III. VÉRIFIER EMAIL TEMPLATES
-- ============================================================================
DO $$
DECLARE
    v_template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_template_count
    FROM public.email_templates
    WHERE name IN ('part_request_created', 'checklist_flagged', 'maintenance_due');
    
    IF v_template_count != 3 THEN
        RAISE EXCEPTION '❌ SEED FAILED: Expected 3 email templates, found %', v_template_count;
    END IF;
    
    RAISE NOTICE '✅ Email Templates: OK (3 templates)';
END $$;

-- IV. VÉRIFIER PERMISSIONS (RLS + FUNCTIONS)
-- ============================================================================
DO $$
DECLARE
    v_policy_count INTEGER;
    v_function_count INTEGER;
BEGIN
    -- Vérifier RLS policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    IF v_policy_count < 44 THEN
        RAISE EXCEPTION '❌ PERMISSIONS FAILED: Expected 44 RLS policies, found %', v_policy_count;
    END IF;
    
    -- Vérifier security functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('is_super_admin', 'is_envirojim_admin', 'is_admin', 'can_manage_rfqs', 'get_auth_org_hierarchy');
    
    IF v_function_count != 5 THEN
        RAISE EXCEPTION '❌ PERMISSIONS FAILED: Expected 5 security functions, found %', v_function_count;
    END IF;
    
    RAISE NOTICE '✅ Permissions: OK';
    RAISE NOTICE '  - RLS Policies: % (expected 44)', v_policy_count;
    RAISE NOTICE '  - Security Functions: 5';
END $$;

-- V. VÉRIFIER AUTH HOOK
-- ============================================================================
DO $$
DECLARE
    v_hook_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'custom_access_token_hook'
    ) INTO v_hook_exists;
    
    IF NOT v_hook_exists THEN
        RAISE EXCEPTION '❌ AUTH HOOK FAILED: custom_access_token_hook not found';
    END IF;
    
    RAISE NOTICE '✅ Auth Hook: OK (custom_access_token_hook exists)';
END $$;

-- VI. TEST SIMULATION LOGIN (sans auth.users)
-- ============================================================================
DO $$
DECLARE
    v_claims JSONB;
BEGIN
    -- Simuler appel hook pour Noé EVE
    v_claims := public.custom_access_token_hook(
        jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000001')
    );
    
    IF v_claims->'claims'->>'org_id' IS NULL THEN
        RAISE EXCEPTION '❌ LOGIN TEST FAILED: org_id claim not generated';
    END IF;
    
    IF v_claims->'claims'->>'role' != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION '❌ LOGIN TEST FAILED: role claim is % instead of SUPER_ADMIN', 
            v_claims->'claims'->>'role';
    END IF;
    
    RAISE NOTICE '✅ Login Simulation: OK';
    RAISE NOTICE '  - org_id: %', v_claims->'claims'->>'org_id';
    RAISE NOTICE '  - role: %', v_claims->'claims'->>'role';
END $$;

-- ============================================================================
-- RÉSULTAT FINAL
-- ============================================================================
SELECT '✅ ALL SEEDS VERIFIED - READY FOR LOGIN' AS status;
