-- FIX_HOOK_PERMISSIONS_NUCLEAR.sql

-- Grant USAGE on public schema to everyone
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, supabase_auth_admin;

-- Grant functionality access
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO supabase_auth_admin, service_role, postgres, anon, authenticated;

-- Specifically for the hook
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;

-- Ensure ownership is correct (can't easily change owner without superuser, but we can try)
ALTER FUNCTION public.custom_access_token_hook(jsonb) OWNER TO postgres;

-- Reload config (just in case)
NOTIFY pgrst, 'reload config';

-- Done.
