-- MANUAL_WIPE.sql
-- Simplified wipe without trigger disabling

BEGIN;

-- TRUNCATE public users (cascades to all child tables like tickets, part_requests)
TRUNCATE TABLE public.users CASCADE;

-- Delete from auth users (if any remain)
DELETE FROM auth.users;

COMMIT;
