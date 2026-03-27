-- Synchronize public.users with auth.users based on email
-- This ensures that RLS policies (auth.uid() = id) work correctly

DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id, email FROM auth.users LOOP
        UPDATE public.users 
        SET id = u.id 
        WHERE email = u.email;
        
        RAISE NOTICE 'Updated public.user ID for % to %', u.email, u.id;
    END LOOP;
END $$;
