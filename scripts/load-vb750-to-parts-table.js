const fs = require('fs');
const path = require('path');

console.log('[PHASE B] LOAD VB750 CANONICAL PARTS INTO PERSISTENT TABLE');
console.log('============================================================\n');

// Load canonical parts
const canonicalPath = path.join(process.cwd(), 'artifacts/canonical-knowledge/parts-canonical.json');
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf-8'));

console.log('[STEP 1] Load canonical dataset');
console.log(`  ✓ Loaded ${canonical.parts.length} clean parts from canonical dataset\n`);

// Map canonical to parts table schema
const partsInsertData = canonical.parts.map(part => ({
  // We'll use a placeholder machine_id for VB750
  // In production, this would be the real UUID from machines table
  machine_id: null, // Will be set dynamically or via migration
  canonical_part_number: part.part_number_raw,
  raw_part_number: part.part_number_raw,
  name: part.designation,
  aliases: [],
  function: 'Component',
  category: 'General',
  assembly: part.source_page ? `Catalog-p${part.source_page}` : 'Unknown',
  subassembly: null,
  compatible_variants: [],
  criticality: 'normal',
  consumable: false,
  maintenance_related: false,
  source_confidence: part.extraction_confidence === 'HIGH' ? 0.95 : 0.75,
  source_refs: {
    pdf_source: 'VB750-Catalog.pdf',
    page: part.source_page,
    part_id: part.part_id,
    extraction_status: part.status,
  },
}));

console.log('[STEP 2] Map canonical schema to parts table schema');
console.log(`  ✓ Mapped ${partsInsertData.length} parts`);
console.log(`  ✓ Schema: canonical_part_number, name, source_confidence, source_refs\n`);

// Generate SQL INSERT statements (for documentation/manual insertion)
const sqlInserts = partsInsertData.map((p, idx) => {
  const sourceRefsJson = JSON.stringify(p.source_refs);
  return `INSERT INTO public.parts (
    machine_id, canonical_part_number, raw_part_number, name, 
    aliases, function, category, assembly, subassembly, 
    compatible_variants, criticality, consumable, maintenance_related, 
    source_confidence, source_refs
  ) VALUES (
    (SELECT id FROM public.machines WHERE name = 'VB750' LIMIT 1),
    '${p.canonical_part_number.replace(/'/g, "''")}',
    '${p.raw_part_number.replace(/'/g, "''")}',
    '${p.name.replace(/'/g, "''")}',
    '{}',
    '${p.function}',
    '${p.category}',
    '${p.assembly}',
    NULL,
    '{}',
    '${p.criticality}'::severity_level,
    ${p.consumable},
    ${p.maintenance_related},
    ${p.source_confidence},
    '${sourceRefsJson.replace(/'/g, "''")}'::jsonb
  ) ON CONFLICT (machine_id, canonical_part_number) DO UPDATE SET
    name = EXCLUDED.name,
    source_confidence = EXCLUDED.source_confidence,
    source_refs = EXCLUDED.source_refs,
    updated_at = NOW()
  RETURNING id;`;
});

console.log('[STEP 3] Generate SQL for parts table insertion');
console.log(`  ✓ Generated ${sqlInserts.length} INSERT statements (upsert)\n`);

// Export data as JSON for runtime loading (for this phase)
const persistentLoadData = {
  machine_name: 'VB750',
  parts_to_load: partsInsertData,
  total_count: partsInsertData.length,
  sql_migration_commands: sqlInserts,
  schema_mapping: {
    part_number_raw: 'canonical_part_number',
    designation: 'name',
    source_page: 'source_refs.page',
    extraction_confidence: 'source_confidence',
    status: 'source_refs.extraction_status',
  },
};

fs.mkdirSync(path.join(process.cwd(), 'artifacts/persistent-load'), { recursive: true });

// Save as JSON for application loading
fs.writeFileSync(
  path.join(process.cwd(), 'artifacts/persistent-load/vb750-parts-load-data.json'),
  JSON.stringify(persistentLoadData, null, 2)
);

// Save SQL migration for direct DB insertion
const sqlMigration = `-- VB750 Parts Truth Layer Migration
-- Loads 46 clean VB750 parts into persistent parts table

${sqlInserts.join('\n\n')}

-- Verify load
SELECT COUNT(*) as vb750_parts_total FROM public.parts 
WHERE machine_id = (SELECT id FROM public.machines WHERE name = 'VB750');
`;

fs.writeFileSync(
  path.join(process.cwd(), 'artifacts/persistent-load/20260327000000_vb750_parts_load.sql'),
  sqlMigration
);

console.log('[STEP 4] Export load artifacts');
console.log(`  ✓ Load data: artifacts/persistent-load/vb750-parts-load-data.json`);
console.log(`  ✓ SQL migration: artifacts/persistent-load/20260327000000_vb750_parts_load.sql\n`);

console.log('[STEP 5] Data quality checks');
console.log(`  ✓ No part_number NULL: ${partsInsertData.every(p => p.canonical_part_number) ? 'YES' : 'NO'}`);
console.log(`  ✓ No designation NULL: ${partsInsertData.every(p => p.name) ? 'YES' : 'NO'}`);
console.log(`  ✓ Confidence score valid: ${partsInsertData.every(p => p.source_confidence >= 0 && p.source_confidence <= 1) ? 'YES' : 'NO'}`);
console.log(`  ✓ Source refs present: ${partsInsertData.every(p => p.source_refs) ? 'YES' : 'NO'}\n`);

console.log('[PHASE B RESULT] Parts load preparation:');
console.log(`  ✓ ${partsInsertData.length} parts mapped for persistent table`);
console.log(`  ✓ SQL migration ready for direct DB execution`);
console.log(`  ✓ Load data exported for application consumption\n`);

process.exit(0);
