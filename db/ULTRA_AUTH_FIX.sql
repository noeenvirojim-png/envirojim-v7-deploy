-- ULTRA_AUTH_FIX.sql
-- Recreates users with bit-perfect similarity to working noe@envirojim.com

DO $$
BEGIN
    -- 1. DELETE PROBLEMATIC USERS
    DELETE FROM auth.users WHERE email IN (
        'parts@envirojim.com', 
        'manager@acmemining.com', 
        'operator@acmemining.com', 
        'admin@northernsp.com', 
        'tech@northernsp.com'
    );
    
    -- Cleanup identities too (cascading should handle it but let's be safe)
    DELETE FROM auth.identities WHERE provider = 'email' AND provider_id NOT IN (
        SELECT id::text FROM auth.users WHERE email = 'noe@envirojim.com'
    );

    -- 2. RE-INSERT WITH FULL COMPATIBILITY
    -- Values taken directly from successful noe@envirojim.com dump
    
    -- PARTS SUPPORT
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, 
        is_super_admin, is_sso_user, is_anonymous,
        created_at, updated_at, 
        email_change_confirm_status
    ) VALUES (
        '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'parts@envirojim.com', 
        crypt('EnviroJim2024!', gen_salt('bf')), NOW(),
        '{"provider": "email", "providers": ["email"]}', '{"full_name": "Parts Support", "email_verified": true}',
        NULL, false, false, NOW(), NOW(), 0
    );

    -- MANAGER
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous, created_at, updated_at, email_change_confirm_status)
    VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@acmemining.com', crypt('EnviroJim2024!', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Mike Manager", "email_verified": true}', NULL, false, false, NOW(), NOW(), 0);

    -- OPERATOR
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous, created_at, updated_at, email_change_confirm_status)
    VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operator@acmemining.com', crypt('EnviroJim2024!', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Tom Operator", "email_verified": true}', NULL, false, false, NOW(), NOW(), 0);

    -- ADMIN NORTHERN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous, created_at, updated_at, email_change_confirm_status)
    VALUES ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@northernsp.com', crypt('EnviroJim2024!', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Nancy Admin", "email_verified": true}', NULL, false, false, NOW(), NOW(), 0);

    -- TECH NORTHERN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous, created_at, updated_at, email_change_confirm_status)
    VALUES ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tech@northernsp.com', crypt('EnviroJim2024!', gen_salt('bf')), NOW(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Terry Technician", "email_verified": true}', NULL, false, false, NOW(), NOW(), 0);

    -- 3. RE-INSERT IDENTITIES
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    SELECT id, id, jsonb_build_object('sub', id, 'email', email, 'email_verified', true, 'phone_verified', false), 'email', id, NOW(), NOW(), NOW()
    FROM auth.users 
    WHERE email IN ('parts@envirojim.com', 'manager@acmemining.com', 'operator@acmemining.com', 'admin@northernsp.com', 'tech@northernsp.com');

    RAISE NOTICE 'ULTRA_AUTH_FIX: Users and Identities recreated.';
END $$;
