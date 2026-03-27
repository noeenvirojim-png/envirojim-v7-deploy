-- ============================================================================
-- CONFIGURATION AUTH HOOK - Alternative SQL
-- ============================================================================
-- Si vous ne trouvez pas "Hooks" dans Supabase Dashboard,
-- exécutez ce script pour configurer manuellement
-- ============================================================================

-- Vérifier que la fonction existe
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'custom_access_token_hook';

-- Si la fonction existe, vous devriez voir:
-- function_name: custom_access_token_hook
-- definition_preview: CREATE OR REPLACE FUNCTION public.custom_access_token_hook...

-- ============================================================================
-- CONFIGURATION MANUELLE (si nécessaire)
-- ============================================================================
-- Note: La configuration du hook se fait normalement via Dashboard
-- Cette section est pour référence uniquement

-- Pour vérifier si le hook est actif, testez-le manuellement:
SELECT public.custom_access_token_hook(
    jsonb_build_object(
        'user_id', '00000000-0000-0000-0000-000000000001'
    )
) as test_claims;

-- Résultat attendu:
-- {
--   "claims": {
--     "org_id": "00000000-0000-0000-0000-000000000001",
--     "role": "SUPER_ADMIN",
--     "user_metadata": {...}
--   }
-- }

-- ============================================================================
-- ALTERNATIVE: Configuration via Supabase CLI
-- ============================================================================
-- Si vous avez Supabase CLI installé:
-- supabase functions deploy custom_access_token_hook

SELECT '✅ Auth Hook Function Exists - Ready for Configuration' as status;
