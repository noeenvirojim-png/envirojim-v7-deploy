-- ============================================================================
-- FIX SUPABASE AUTH TRIGGER (DELETE)
-- ============================================================================
-- The error "Database error loading user" on DELETE means there is ALSO
-- a broken trigger on user deletion.

-- 1. Drop the DELETE trigger (often named on_auth_user_deleted)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- 2. Drop the DELETE function if it exists (optional cleanup)
DROP FUNCTION IF EXISTS public.handle_user_delete();

-- 3. (Optional) Recreate a safer delete trigger
-- Takes care of cleaning up public.users when auth.user is deleted
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete();
