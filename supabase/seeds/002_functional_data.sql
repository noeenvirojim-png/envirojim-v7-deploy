BEGIN;

-- Seed a machine for the Root Organization to ensure visibility for the Admin
INSERT INTO public.machines (
  id, 
  organization_id,
  serial_number, 
  make, 
  model, 
  status_internal,
  current_hours,
  engine_make,
  engine_serial,
  created_at, 
  updated_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'SEED-CANONICAL-001',
  'Caterpillar',
  '320D',
  'active',
  1250,
  'Cat C7.1',
  'ENG-CAT-789',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  make = EXCLUDED.make,
  model = EXCLUDED.model,
  status_internal = EXCLUDED.status_internal,
  current_hours = EXCLUDED.current_hours,
  engine_make = EXCLUDED.engine_make,
  engine_serial = EXCLUDED.engine_serial,
  updated_at = now();

COMMIT;
