-- ============================================================================
-- FIX: Permissions du Auth Hook
-- ============================================================================
-- Il semble que le hook ne s'exécute pas lors du login.
-- Cela est souvent dû à des permissions manquantes pour le rôle système.
-- ============================================================================

-- 1. Accorder explicitement les droits au rôle système de Supabase Auth
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- 2. Révoquer les droits publics pour la sécurité
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- 3. Vérifier que la fonction est accessible
SELECT 
    proname, 
    proowner::regrole, 
    proacl 
FROM pg_proc 
WHERE proname = 'custom_access_token_hook';

-- 4. Test simulation (comme supabase_auth_admin si possible, sinon test normal)
SELECT public.custom_access_token_hook(
    jsonb_build_object(
        'user_id', (SELECT id FROM auth.users WHERE email = 'noe@envirojim.com')
    )
);

-- ============================================================================
-- NOTE IMPORTANTE:
-- ============================================================================
-- Après avoir exécuté ce script, RETOURNEZ dans Supabase Dashboard:
-- 1. Authentication -> Hooks
-- 2. Désactivez le hook (si possible)
-- 3. Réactivez-le
-- (Parfois le changement de permission nécessite un refresh du cache interne)
