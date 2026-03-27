-- ============================================================================
-- FIX SUPABASE AUTH TRIGGER
-- ============================================================================
-- This script fixes the common "Database error" during user creation.
-- It safely drops the existing trigger and recreates the sync function.

-- 1. Drop existing trigger (if any) to break the error loop
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create or Replace the sync function
-- This function copies the new user from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, is_active)
  VALUES (
    new.id,
    new.email,
    'CLIENT', -- Default role, can be changed later
    new.raw_user_meta_data->>'full_name',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-enable the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Verify by checking if user exists (optional test)
-- SELECT * FROM auth.users WHERE email = 'noe@envirojim.com';
