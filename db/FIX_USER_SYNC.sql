-- ============================================================================
-- FIX: Synchroniser auth.users → public.users (Permission Fix)
-- ============================================================================
-- Le script setup-auth-users.js a créé les users dans auth.users
-- mais n'a pas pu les synchroniser dans public.users à cause de RLS
-- 
-- Cette correction synchronise manuellement les UUIDs
-- ============================================================================

-- Désactiver temporairement RLS pour permettre la synchronisation
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Mettre à jour Noé EVE avec le bon UUID de auth.users
UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'noe@envirojim.com')
WHERE email = 'noe@envirojim.com';

-- Mettre à jour Alexandre Paré avec le bon UUID de auth.users
UPDATE public.users
SET id = (SELECT id FROM auth.users WHERE email = 'parts@envirojim.com')
WHERE email = 'parts@envirojim.com';

-- Réactiver RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Vérifier la synchronisation
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    pu.role,
    CASE 
        WHEN au.id = pu.id THEN '✅ SYNCED'
        ELSE '❌ MISMATCH'
    END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email IN ('noe@envirojim.com', 'parts@envirojim.com');

-- Résultat attendu:
-- Les deux lignes doivent avoir sync_status = '✅ SYNCED'
