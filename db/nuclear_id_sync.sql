-- NUCLEAR REPAIR: Cascading User ID Synchronization
DO $$
DECLARE
    u RECORD;
BEGIN
    -- Disable constraints temporarily to avoid issues during multi-step updates if needed
    -- (Though we'll try straight updates first)
    
    FOR u IN SELECT id as new_id, email FROM auth.users LOOP
        -- We need to find the OLD ID for this email in public users
        -- But only if it's different
        
        RAISE NOTICE 'Syncing email: % to new_id: %', u.email, u.new_id;
        
        -- 1. Update referencing tables FIRST (if we know the old ID)
        -- This is tricky if we don't know the old ID.
        -- Let's use a subquery to find the old ID.
        
        UPDATE public.tickets SET created_by = u.new_id WHERE created_by = (SELECT id FROM public.users WHERE email = u.email AND id != u.new_id);
        UPDATE public.tickets SET assigned_to = u.new_id WHERE assigned_to = (SELECT id FROM public.users WHERE email = u.email AND id != u.new_id);
        UPDATE public.diagnostic_sessions SET user_id = u.new_id WHERE user_id = (SELECT id FROM public.users WHERE email = u.email AND id != u.new_id);
        UPDATE public.checklists SET technician_user_id = u.new_id WHERE technician_user_id = (SELECT id FROM public.users WHERE email = u.email AND id != u.new_id);
        
        -- 2. Finally update the user record itself
        UPDATE public.users SET id = u.new_id WHERE email = u.email AND id != u.new_id;
        
    END LOOP;
    
    RAISE NOTICE 'User ID synchronization complete.';
END $$;
