const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuid } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const ROOT = process.cwd();

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [k, ...rest] = line.split('=');
      const v = rest.join('=').trim().replace(/^\"|\"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

async function main() {
  console.log('[SIMPLE PARTS EXTRACTION]');
  console.log('========================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const pdfPath = path.join(ROOT, 'VB750-Catalog.pdf');
  const tmpFile = '/tmp/vb750.txt';
  execSync(`pdftotext \"${pdfPath}\" \"${tmpFile}\"`, { stdio: 'pipe' });

  const fullText = fs.readFileSync(tmpFile, 'utf8');
  const lines = fullText.split('\n');

  // Find all lines with potential parts (number + text)
  const parts = [];
  const seen = new Set();
  let inTableSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track if we're in a parts table
    if (/Pos\.\s+Stk\.\s+Artikel/.test(line)) {
      inTableSection = true;
      continue;
    }
    if (inTableSection && /^[A-Z][a-z]+\s+/  .test(line) && line.length > 30) {
      inTableSection = false;
    }

    if (!inTableSection) continue;

    // Skip empty lines and metadata
    if (!line || /^(Typ|Type|Zeichnung|Drawing|Bemerkung|Comment|Seite|Page|V|S\/N|incl\.|nicht|Option|Siehe|See|Monat|Datum|Year|repräsentiert|illustrated|correspond)/.test(line)) {
      continue;
    }

    // Look for part number patterns: leading digits
    const match = line.match(/^(\d+[\d\s\.\-]*)\s+([A-Za-z].*)$/);
    if (match) {
      const partNum = match[1].trim();
      const designation = match[2].trim();

      // Filter: must have substance
      if (partNum.replace(/\s/g, '').length < 3 || designation.length < 3) continue;

      // Skip obvious non-parts
      if (/^(repräsentiert|illustrated|correspond|Recycling|HAMMEL|tats|betrifft|abgerufen)/.test(designation)) {
        continue;
      }

      const key = `${partNum}|${designation}`;
      if (!seen.has(key)) {
        seen.add(key);
        parts.push({ partNum, designation });
      }
    }
  }

  console.log(`✓ Found ${parts.length} parts\n`);
  if (parts.length > 0) {
    console.log('Samples:');
    for (const p of parts.slice(0, 10)) {
      console.log(`  "${p.partNum}" | "${p.designation}"`);
    }
    console.log();
  }

  // Clear DB and insert
  const { data: existing } = await supabase.from('parts_extraction_rows').select('id');
  if (existing?.length > 0) {
    await supabase.from('parts_extraction_rows').delete().in('id', existing.map(r => r.id));
  }

  const machineId = '22222222-2222-2222-2222-222222222222';
  const auditRunId = uuid();

  await supabase.from('parts_extraction_audit_runs').insert({
    id: auditRunId,
    machine_id: machineId,
    source_document_path: pdfPath,
    source_document_name: 'VB750-Catalog.pdf',
    run_status: 'COMPLETED',
  });

  const rows = parts.map(p => ({
    id: uuid(),
    audit_run_id: auditRunId,
    machine_id: machineId,
    source_document_name: 'VB750-Catalog.pdf',
    source_page: 1,
    row_fingerprint: `${p.partNum}|${p.designation}|1`,
    part_number_raw: p.partNum,
    designation_raw: p.designation,
    evidence_snippet: `${p.partNum} ${p.designation}`.slice(0, 500),
    validation_status: (p.partNum.replace(/\s/g, '').length >= 3 && p.designation.length >= 5) ? 'VALIDATED' : 'NEEDS_REVIEW',
    extracted_payload: {},
  }));

  console.log('[PERSISTING]');
  if (rows.length > 0) {
    const { error } = await supabase.from('parts_extraction_rows').insert(rows);
    if (error) {
      console.log(`✗ Error: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`✓ Inserted ${rows.length} rows\n`);

  const { data: final } = await supabase.from('parts_extraction_rows').select('validation_status');
  const counts = { VALIDATED: 0, NEEDS_REVIEW: 0, REJECTED: 0 };
  for (const row of (final || [])) {
    counts[row.validation_status]++;
  }

  const total = final?.length || 0;
  const coverage = total > 0 ? ((counts.VALIDATED / total) * 100).toFixed(1) : 0;

  console.log(`[FINAL STATS]`);
  console.log(`- Total: ${total}`);
  console.log(`- Validated: ${counts.VALIDATED}`);
  console.log(`- Needs Review: ${counts.NEEDS_REVIEW}`);
  console.log(`- Rejected: ${counts.REJECTED}`);
  console.log(`- Coverage: ${coverage}%\n`);

  process.exit(0);
}

main().catch(err => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
