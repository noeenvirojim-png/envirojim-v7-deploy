-- ============================================================================
-- GLOBAL REPAIR SCRIPT: AUTH & PUBLIC USER SYNC
-- ============================================================================
-- OBJECTIVE: Fix "Database error loading user" and ensuring clean state.
-- SCOPE: Triggers, Functions, and Data Cleanup.

-- 1. CLEANUP (Dangerous but necessary to unblock)
-- ============================================================================
-- Remove existing triggers to stop the errors immediately.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- 2. FIX SYNC FUNCTIONS (The Logic)
-- ============================================================================

-- Function to handle NEW users (Insert into public)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, is_active)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'CLIENT'), -- Default to CLIENT if no role metadata
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle DELETED users (Remove from public)
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RE-APPLY TRIGGERS
-- ============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete();

-- 4. VERIFICATION (Optional)
-- ============================================================================
-- Check if things are clean.
-- SELECT count(*) FROM auth.users;
-- SELECT count(*) FROM public.users;
