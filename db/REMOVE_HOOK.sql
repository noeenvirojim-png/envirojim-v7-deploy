-- REMOVE_HOOK.sql
-- Drop the function to test if login works without it

DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb) CASCADE;
