-- NUCLEAR_AUTH_RESET.sql
-- WARNING: This deletes ALL users to fix the schema corruption.

BEGIN;

-- 1. Disable triggers to prevent recursion during deletion
ALTER TABLE public.users DISABLE TRIGGER ALL;

-- 2. Clear Public Users
TRUNCATE TABLE public.users CASCADE;

-- 3. Clear Auth Users (requires special permissions usually, but we use DELETE)
-- Note: We can't TRUNCATE auth.users easily, so we DELETE.
DELETE FROM auth.users;

-- 4. Re-enable triggers
ALTER TABLE public.users ENABLE TRIGGER ALL;

COMMIT;
