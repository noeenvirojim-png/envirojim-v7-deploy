-- RESET_HOOK_CLEAN.sql
-- Force drop and recreate of the auth hook to clear corruption

-- 1. Drop existing hook (CASCADE removes dependencies)
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb) CASCADE;

-- 2. Recreate the hook cleanly (start with simple logic)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_role public.user_role;
    user_id uuid;
BEGIN
    -- INIT
    claims := event->'claims';
    
    -- SIMPLE LOOKUP
    BEGIN
        user_id := (event->>'user_id')::uuid;
        SELECT role INTO user_role FROM public.users WHERE id = user_id;
        
        IF FOUND THEN
            claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN event;
    END;

    -- UPDATE EVENT
    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
END;
$$;

-- 3. Re-grant permissions explicitly
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;
