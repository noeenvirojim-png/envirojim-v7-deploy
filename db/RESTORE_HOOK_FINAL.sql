-- RESTORE_HOOK_FINAL.sql
-- Enterprise-grade bulletproof JWT hook

-- 1. Create or Replace the function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  claims jsonb := event->'claims';
  user_id uuid := (event->>'user_id')::uuid;
  user_role text;
  user_org_id uuid;
begin
  -- Fetch user metadata from public.users
  -- Note: We assume the table public.users has columns 'role' and 'organization_id'
  select role, organization_id
  into user_role, user_org_id
  from public.users
  where id = user_id;

  -- Inject role into app_metadata
  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role), true);
  end if;

  -- Inject org_id into app_metadata
  if user_org_id is not null then
    claims := jsonb_set(claims, '{app_metadata,organization_id}', to_jsonb(user_org_id), true);
  else
    -- HARD FALLBACK: mark as NO_ORG instead of breaking auth
    claims := jsonb_set(claims, '{app_metadata,organization_id}', '"NO_ORG"', true);
  end if;

  -- Logically we should also handle if we want it at the top level for easier extraction
  -- But standard Supabase hook practice often puts custom claims in app_metadata
  
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- 2. Ensure permissions
grant usage on schema public to supabase_auth_admin;
grant select on public.users to supabase_auth_admin;

-- 3. (Optional/Required) Re-bind the hook if it was dropped or needs updating
-- This part depends on Supabase internal settings, usually triggered via UI or 
-- explicit SQL if you have enough permissions.
-- ALTER USER ... SET ... (Standard Supabase hooks are managed via their dashboard)
-- However, just updating the function body is usually enough if the hook is already active.
