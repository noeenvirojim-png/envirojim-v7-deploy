-- ==============================================================================
-- PATCH_AUTH_HOOK.sql
-- Description: Robuste repair of custom_access_token_hook with extensive logging
-- and explicit permission grants to fix "Database error querying schema".
-- ==============================================================================

-- 1. Grant usage on schema to authentication role (CRITICAL FIX)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- 2. Grant access to users table (CRITICAL FIX)
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;

-- 3. Redefine Hook with Error Trapping & Logging
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
    user_org_id uuid;
    user_email text;
    user_id uuid;
BEGIN
    -- Log entry for debugging
    RAISE NOTICE 'Auth Hook Triggered for Event: %', event;

    -- Initialize claims
    claims := event->'claims';

    -- Safely extract User ID
    BEGIN
        user_id := (event->>'user_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Auth Hook Failed to parse user_id: %', event->>'user_id';
        RETURN event; -- Return original event if ID is invalid
    END;

    -- Lookup User in public.users
    SELECT role, organization_id, email
    INTO user_role, user_org_id, user_email
    FROM public.users
    WHERE id = user_id;

    -- Handle User Not Found
    IF NOT FOUND THEN
        RAISE WARNING 'Auth Hook: User ID % not found in public.users', user_id;
        RETURN event;
    END IF;

    -- Log Success
    RAISE NOTICE 'Auth Hook Success: Found user % with role %', user_email, user_role;

    -- App Metadata Claims (Verified by Supabase Auth)
    claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));
    claims := jsonb_set(claims, '{app_metadata, organization_id}', to_jsonb(user_org_id));

    -- Update the event with new claims
    event := jsonb_set(event, '{claims}', claims);

    RETURN event;
END;
$$;

-- 4. Grant Execute Permission (CRITICAL FIX)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;
