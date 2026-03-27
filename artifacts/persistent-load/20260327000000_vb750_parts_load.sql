-- VB750 Parts Truth Layer Migration
-- Loads 46 clean VB750 parts into persistent parts table

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '17515',
    '17515',
    'Axialkolbenverstellpumpe',
    '{}',
    'Component',
    'General',
    'Catalog-p3',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":3,"part_id":"VB750-P001","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '17516',
    '17516',
    'Axialkolbenverstellpumpe',
    '{}',
    'Component',
    'General',
    'Catalog-p3',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":3,"part_id":"VB750-P002","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 1457',
    '1 1457',
    'Zahnradpumpe',
    '{}',
    'Component',
    'General',
    'Catalog-p3',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":3,"part_id":"VB750-P003","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 13629',
    '1 13629',
    'Antriebsmotor',
    '{}',
    'Component',
    'General',
    'Catalog-p4',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":4,"part_id":"VB750-P004","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 11812',
    '1 11812',
    'Kurbelgeh�useentl�ftungs- 326-4689',
    '{}',
    'Component',
    'General',
    'Catalog-p4',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":4,"part_id":"VB750-P005","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 1005',
    '1 1005',
    'Blockkugelhahn',
    '{}',
    'Component',
    'General',
    'Catalog-p4',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":4,"part_id":"VB750-P006","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 8178',
    '1 8178',
    'Luftfilter Hauptelement',
    '{}',
    'Component',
    'General',
    'Catalog-p5',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":5,"part_id":"VB750-P007","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 17582',
    '1 17582',
    'Luftfilter Sicherheitselement',
    '{}',
    'Component',
    'General',
    'Catalog-p5',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":5,"part_id":"VB750-P008","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 16253',
    '1 16253',
    'Kombik�hler',
    '{}',
    'Component',
    'General',
    'Catalog-p6',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":6,"part_id":"VB750-P009","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 22025',
    '1 22025',
    'L�fterrad (Wendel�fter)',
    '{}',
    'Component',
    'General',
    'Catalog-p6',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":6,"part_id":"VB750-P010","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 21217',
    '1 21217',
    'Steuereinheit',
    '{}',
    'Component',
    'General',
    'Catalog-p6',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":6,"part_id":"VB750-P011","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '3.1 1 21021',
    '3.1 1 21021',
    'Luftfilter f�r Steuereinheit Air filter for control unit',
    '{}',
    'Component',
    'General',
    'Catalog-p6',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":6,"part_id":"VB750-P012","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 9692',
    '1 9692',
    'Steuerblock Fahren / Shreddern Tries 935.501A',
    '{}',
    'Component',
    'General',
    'Catalog-p8',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":8,"part_id":"VB750-P013","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 13277',
    '1 13277',
    'Handventil',
    '{}',
    'Component',
    'General',
    'Catalog-p9',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":9,"part_id":"VB750-P014","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 16717',
    '1 16717',
    'Wege-Sitzventil',
    '{}',
    'Component',
    'General',
    'Catalog-p9',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":9,"part_id":"VB750-P015","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '4 2788',
    '4 2788',
    'Schauglas (Diesel)',
    '{}',
    'Component',
    'General',
    'Catalog-p10',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":10,"part_id":"VB750-P016","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '2 1915',
    '2 1915',
    'Tankverschluss',
    '{}',
    'Component',
    'General',
    'Catalog-p10',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":10,"part_id":"VB750-P017","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '2 15348',
    '2 15348',
    'Tankbel�ftungsfilter',
    '{}',
    'Component',
    'General',
    'Catalog-p10',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":10,"part_id":"VB750-P018","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '20600',
    '20600',
    'Verschlei�blech (Getriebe-',
    '{}',
    'Component',
    'General',
    'Catalog-p12',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":12,"part_id":"VB750-P019","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1380',
    '1380',
    'Verschlei�blech (Lagerseite) 0750 04 06 01 00 1-10860409',
    '{}',
    'Component',
    'General',
    'Catalog-p12',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":12,"part_id":"VB750-P020","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1901',
    '1901',
    'Umlenkrad',
    '{}',
    'Component',
    'General',
    'Catalog-p12',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":12,"part_id":"VB750-P021","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '5584',
    '5584',
    'Abdichtgummi unter Hacker- 2150 x 100 x 10 mm',
    '{}',
    'Component',
    'General',
    'Catalog-p12',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":12,"part_id":"VB750-P022","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1577',
    '1577',
    'Wellenlagerung, komplett',
    '{}',
    'Component',
    'General',
    'Catalog-p12',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":12,"part_id":"VB750-P023","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '12 1756',
    '12 1756',
    'St�tzring',
    '{}',
    'Component',
    'General',
    'Catalog-p20',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":20,"part_id":"VB750-P024","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 3968',
    '1 3968',
    'Antriebsrolle',
    '{}',
    'Component',
    'General',
    'Catalog-p22',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":22,"part_id":"VB750-P025","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 11011',
    '1 11011',
    'Hydraulikmotor',
    '{}',
    'Component',
    'General',
    'Catalog-p22',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":22,"part_id":"VB750-P026","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1 6996',
    '1 6996',
    'Drehmomentst�tze',
    '{}',
    'Component',
    'General',
    'Catalog-p22',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":22,"part_id":"VB750-P027","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '2 8847',
    '2 8847',
    'Spannlager',
    '{}',
    'Component',
    'General',
    'Catalog-p22',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":22,"part_id":"VB750-P028","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '2 14934',
    '2 14934',
    'Grundplatte',
    '{}',
    'Component',
    'General',
    'Catalog-p22',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":22,"part_id":"VB750-P029","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '20069',
    '20069',
    'Vierlochflanschlager',
    '{}',
    'Component',
    'General',
    'Catalog-p23',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":23,"part_id":"VB750-P030","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '4878',
    '4878',
    'Flacheisenabstreifer, komplett 0750 05 09 00 00 1',
    '{}',
    'Component',
    'General',
    'Catalog-p24',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":24,"part_id":"VB750-P031","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '4353',
    '4353',
    'Wasserbed�sung, komplett',
    '{}',
    'Component',
    'General',
    'Catalog-p27',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":27,"part_id":"VB750-P032","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1839',
    '1839',
    'R�cksp�l-Schutzfilter',
    '{}',
    'Component',
    'General',
    'Catalog-p27',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":27,"part_id":"VB750-P033","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1754',
    '1754',
    'Magnetventil',
    '{}',
    'Component',
    'General',
    'Catalog-p27',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":27,"part_id":"VB750-P034","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '9266',
    '9266',
    'Flachstrahld�se',
    '{}',
    'Component',
    'General',
    'Catalog-p27',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":27,"part_id":"VB750-P035","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '2547',
    '2547',
    'Batterie',
    '{}',
    'Component',
    'General',
    'Catalog-p28',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":28,"part_id":"VB750-P036","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '225',
    '225',
    'Ah / 12 V',
    '{}',
    'Component',
    'General',
    'Catalog-p28',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":28,"part_id":"VB750-P037","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '1665',
    '1665',
    'Steuerung',
    '{}',
    'Component',
    'General',
    'Catalog-p28',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":28,"part_id":"VB750-P038","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '5942',
    '5942',
    'Basic Controller',
    '{}',
    'Component',
    'General',
    'Catalog-p28',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":28,"part_id":"VB750-P039","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '4227',
    '4227',
    'Erweiterung',
    '{}',
    'Component',
    'General',
    'Catalog-p28',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":28,"part_id":"VB750-P040","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '5943',
    '5943',
    'Basic Display',
    '{}',
    'Component',
    'General',
    'Catalog-p28',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":28,"part_id":"VB750-P041","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '18036',
    '18036',
    'Funkmodem (Option)',
    '{}',
    'Component',
    'General',
    'Catalog-p29',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":29,"part_id":"VB750-P042","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '9340',
    '9340',
    'Display (Option)',
    '{}',
    'Component',
    'General',
    'Catalog-p29',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":29,"part_id":"VB750-P043","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '19221',
    '19221',
    'Antenne (Option)',
    '{}',
    'Component',
    'General',
    'Catalog-p29',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":29,"part_id":"VB750-P044","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '15594',
    '15594',
    'Funkfernsteuerung, komplett NOVA-L 2K RX-ES-CAN HL',
    '{}',
    'Component',
    'General',
    'Catalog-p30',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":30,"part_id":"VB750-P045","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '458',
    '458',
    'MHz, scan group 1 S/N 21222260596',
    '{}',
    'Component',
    'General',
    'Catalog-p30',
    NULL,
    '{}',
    'normal'::severity_level,
    false,
    false,
    0.95,
    '{"pdf_source":"VB750-Catalog.pdf","page":30,"part_id":"VB750-P046","extraction_status":"VALIDATED"}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;

-- Verify load
SELECT COUNT(*) as vb750_parts_total FROM public.parts 
WHERE machine_id = (SELECT id FROM public.machines WHERE name = 'VB750');
