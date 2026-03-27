-- Ensure all users have an entry in auth.identities
-- This is often required for Supabase GoTrue to work correctly

DO $$
BEGIN
    DELETE FROM auth.identities;
    
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    SELECT 
        id, 
        id, 
        jsonb_build_object('sub', id, 'email', email, 'email_verified', true, 'phone_verified', false),
        'email',
        id, -- Use ID as provider_id to match working user
        now(), 
        now(), 
        now()
    FROM auth.users
    ON CONFLICT (provider, provider_id) DO NOTHING;

    RAISE NOTICE 'Synchronized auth.identities for % users', (SELECT count(*) FROM auth.users);
END $$;
