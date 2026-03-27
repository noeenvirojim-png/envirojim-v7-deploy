DO $$
DECLARE
    user_id uuid;
    is_adm boolean;
    machine_count int;
BEGIN
    -- Get ID for noe
    SELECT id INTO user_id FROM auth.users WHERE email = 'noe@envirojim.com';
    
    -- Set session variables to simulate GoTrue login
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', user_id)::text, true);
    PERFORM set_config('request.jwt.claim.sub', user_id::text, true); -- Often needed for auth.uid()
    
    -- Test is_admin()
    SELECT is_admin() INTO is_adm;
    RAISE NOTICE 'User % (ID: %) -> is_admin(): %', 'noe@envirojim.com', user_id, is_adm;
    
    -- Test machines visibility
    SELECT count(*) INTO machine_count FROM public.machines;
    RAISE NOTICE 'Visible Machines: %', machine_count;
    
    -- Reset role (optional, transaction ends anyway)
    -- PERFORM set_config('role', 'postgres', true);
END $$;
