SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';

SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'supabase_auth_admin';
