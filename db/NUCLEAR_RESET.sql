-- ============================================================================
-- NUCLEAR RESET: Remove all sync mechanisms
-- ============================================================================
-- Execute this in Supabase SQL Editor to clean the database state

-- 1. Drop all triggers on auth.users (if we have permission)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users CASCADE;

-- 2. Drop all sync functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_delete() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_update() CASCADE;

-- 3. Remove FK constraints from public.users (if any)
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE IF EXISTS public.machines DROP CONSTRAINT IF EXISTS machines_owner_user_id_fkey;
ALTER TABLE IF EXISTS public.part_requests DROP CONSTRAINT IF EXISTS part_requests_requester_user_id_fkey;

-- 4. Clear public.users (since it's empty anyway)
TRUNCATE TABLE public.users CASCADE;

-- 5. Verify clean state
SELECT 
  'Triggers on auth.users' as check_type,
  count(*) as count
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'

UNION ALL

SELECT 
  'Rows in public.users' as check_type,
  count(*) as count
FROM public.users;
