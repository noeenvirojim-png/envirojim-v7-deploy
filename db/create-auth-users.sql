-- 1. Activer l'extension (Obligatoire)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. RESET DES MOTS DE PASSE (Update des utilisateurs existants)
-- Si l'utilisateur existe déjà, on remet son mot de passe à 'EnviroJim2024!'
UPDATE auth.users
SET encrypted_password = crypt('EnviroJim2024!', gen_salt('bf'))
WHERE email IN (
  'noe@envirojim.com', 'parts@envirojim.com', 
  'manager@acmemining.com', 'operator@acmemining.com', 
  'admin@northernsp.com', 'tech@northernsp.com'
);

-- 3. CRÉATION DES UTILISATEURS MANQUANTS (Insert s'ils n'existent pas)
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
SELECT
    '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'noe@envirojim.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Noe Admin"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'noe@envirojim.com');

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
SELECT
    '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'parts@envirojim.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Parts Support"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'parts@envirojim.com');

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
SELECT
    '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'manager@acmemining.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Mike Manager"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'manager@acmemining.com');

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
SELECT
    '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'operator@acmemining.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Tom Operator"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'operator@acmemining.com');

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
SELECT
    '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'admin@northernsp.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Nancy Admin"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@northernsp.com');

INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
)
SELECT
    '66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'tech@northernsp.com',
    crypt('EnviroJim2024!', gen_salt('bf')), NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Terry Technician"}', 'authenticated', 'authenticated'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tech@northernsp.com');
