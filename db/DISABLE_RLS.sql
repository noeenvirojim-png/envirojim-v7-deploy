-- DISABLE_RLS.sql
-- TEMPORARY DEBUG: Disable RLS on users table to rule out policy conflicts

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
