BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- ENVIROJIM LOCAL AUTH SOURCE OF TRUTH
-- email: noe@envirojim.com
-- password: EnviroJim2024!
-- =========================================================

-- 1) Root organization
INSERT INTO public.organizations (
  id,
  name,
  type,
  status,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'EnviroJim Root',
  'PLATFORM',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  updated_at = now();

-- 2) Remove duplicate records by email except canonical user
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id
  FROM auth.users
  WHERE email = 'noe@envirojim.com'
    AND id <> 'af7f18cb-702d-4bdc-a458-5194d9c0e3dd'
);

DELETE FROM public.users
WHERE email = 'noe@envirojim.com'
  AND id <> 'af7f18cb-702d-4bdc-a458-5194d9c0e3dd';

DELETE FROM auth.users
WHERE email = 'noe@envirojim.com'
  AND id <> 'af7f18cb-702d-4bdc-a458-5194d9c0e3dd';

-- 3) Canonical auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'af7f18cb-702d-4bdc-a458-5194d9c0e3dd',
  'authenticated',
  'authenticated',
  'noe@envirojim.com',
  crypt('EnviroJim2024!', gen_salt('bf', 10)),
  now(),
  now(),
  '',
  '',
  '',
  '',
  jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email')
  ),
  jsonb_build_object(
    'full_name', 'Noé Admin',
    'role', 'ENVIROJIM_ADMIN'
  ),
  false,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  aud = EXCLUDED.aud,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

-- 4) Canonical identity
DELETE FROM auth.identities
WHERE user_id = 'af7f18cb-702d-4bdc-a458-5194d9c0e3dd'
   OR (provider = 'email' AND provider_id IN (
        'noe@envirojim.com',
        'af7f18cb-702d-4bdc-a458-5194d9c0e3dd'
      ));

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
VALUES (
  'bf7f18cb-702d-4bdc-a458-5194d9c0e3dd',
  'af7f18cb-702d-4bdc-a458-5194d9c0e3dd',
  jsonb_build_object(
    'sub', 'af7f18cb-702d-4bdc-a458-5194d9c0e3dd',
    'email', 'noe@envirojim.com',
    'email_verified', true
  ),
  'email',
  'noe@envirojim.com',
  now(),
  now(),
  now()
);

-- 5) Canonical public profile
INSERT INTO public.users (
  id,
  email,
  role,
  organization_id,
  full_name,
  status,
  created_at,
  updated_at
)
VALUES (
  'af7f18cb-702d-4bdc-a458-5194d9c0e3dd',
  'noe@envirojim.com',
  'ENVIROJIM_ADMIN',
  '00000000-0000-0000-0000-000000000000',
  'Noé Admin',
  'ACTIVE',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status,
  updated_at = now();

COMMIT;
