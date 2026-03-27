-- PROCUREMENT READY PACK
-- Execute after DB schema is repaired
-- This runs: seed → write → verify in one batch

-- ORG (already exists, skip if present)
INSERT INTO public.organizations (name, type, status)
SELECT 'VB750-Org', 'CLIENT', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'VB750-Org');

-- MACHINE
INSERT INTO public.machines
(organization_id, serial_number, lifecycle_type, status_internal, status_client_facing, model)
VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'VB750-WRITE-TEST-' || to_char(now(), 'YYYYMMDDHHmmss'),
  'owned',
  'active',
  'needs_attention',
  'VB750'
) RETURNING id INTO machine_id;

-- PARTS (minimal 3)
INSERT INTO public.parts
(machine_id, canonical_part_number, raw_part_number, name, source_confidence, source_refs, aliases, compatible_variants, criticality, consumable, maintenance_related)
SELECT machine_id, part_data->>'part_number', part_data->>'part_number', part_data->>'designation', 0.95, jsonb_build_object('page', 3), '{}', '{}', 'normal', false, false
FROM (
  VALUES
  ('{"part_number":"17515","designation":"Axialkolbenverstellpumpe"}'),
  ('{"part_number":"17516","designation":"Axialkolbenverstellpumpe"}'),
  ('{"part_number":"1 1457","designation":"Zahnradpumpe"}')
) AS t(part_data)
WHERE TRUE;

-- PART_ORDERS
INSERT INTO public.part_orders
(organization_id, machine_id, status, notes)
VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  (SELECT id FROM public.machines WHERE model = 'VB750' ORDER BY created_at DESC LIMIT 1),
  'draft',
  'Real VB750 procurement WRITE_PROVEN execution'
) RETURNING id INTO order_id;

-- PART_ORDER_ITEMS
INSERT INTO public.part_order_items
(part_order_id, part_id, part_number, quantity, unit_price, urgency)
SELECT order_id, p.id, p.canonical_part_number, 1, 100, 'normal'
FROM public.parts p
WHERE p.machine_id = (SELECT id FROM public.machines WHERE model = 'VB750' ORDER BY created_at DESC LIMIT 1)
LIMIT 3;

-- VERIFY
SELECT
  o.id as order_id,
  o.machine_id,
  COUNT(i.id) as items_count
FROM public.part_orders o
LEFT JOIN public.part_order_items i ON o.id = i.part_order_id
WHERE o.machine_id = (SELECT id FROM public.machines WHERE model = 'VB750' ORDER BY created_at DESC LIMIT 1)
GROUP BY o.id, o.machine_id;
