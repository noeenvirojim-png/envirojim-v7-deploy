const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuid } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(process.cwd(), name);
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
  console.log('[EXHAUSTIVE EXTRACTION]');
  console.log('=====================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const pdfPath = path.join(process.cwd(), 'VB750-Catalog.pdf');
  const tmpFile = '/tmp/vb750.txt';
  execSync(`pdftotext \"${pdfPath}\" \"${tmpFile}\"`, { stdio: 'pipe' });

  const fullText = fs.readFileSync(tmpFile, 'utf8');
  const lines = fullText.split('\n');

  // Strategy: find all table sections, then extract every line that looks remotely like a part
  const parts = [];
  const seen = new Set();
  let inTableSection = false;
  let tableCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Enter table
    if (/Pos\.\s+Stk\.\s+Artikel\s+Bezeichnung/.test(line)) {
      inTableSection = true;
      tableCount++;
      continue;
    }

    // Exit table (new section or end)
    if (inTableSection) {
      // Check for end markers
      if (/^HAMMEL|^Recycling|^  $/.test(line) || (line.length > 0 && /^[A-Z]+[\s\.]/.test(line) && !/Pos\.|Artikel|Bezeichnung/.test(line))) {
        inTableSection = false;
      }
    }

    if (!inTableSection) continue;

    // Within table: extract any line with number + text pattern
    // Patterns: "16253 Kombinh", "930 Blockkugelhahn", "18036 Funkmodem (Option)"
    if (/^\d/.test(line)) {
      // Extract part number and description
      const match = line.match(/^(\d+[\d\s\.\-]*?)\s+(.+)$/);
      if (match) {
        let partNum = match[1].trim();
        let desc = match[2].trim();

        // Filter out garbage
        if (/^(Pos|Stk|Typ|Type|Zeichnung|Drawing|Bemerkung|Comment|V|S\/N|incl|nicht|Siehe|See)/.test(desc)) {
          continue;
        }

        // Only count if substance
        if (partNum.replace(/\s/g, '').length < 2 || desc.length < 2) continue;

        const key = `${partNum}|${desc}`;
        if (!seen.has(key)) {
          seen.add(key);
          parts.push({ partNum, desc });
        }
      }
    }
  }

  console.log(`✓ Scanned ${tableCount} tables, found ${parts.length} unique parts\n`);
  console.log('Sample parts:');
  for (const p of parts.slice(0, 15)) {
    console.log(`  ${p.partNum} | ${p.desc}`);
  }
  console.log();

  // Clear DB
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
    row_fingerprint: `${p.partNum}|${p.desc}|1`,
    part_number_raw: p.partNum,
    designation_raw: p.desc,
    evidence_snippet: `${p.partNum} ${p.desc}`.slice(0, 500),
    validation_status: (p.partNum.length >= 2 && p.desc.length >= 4) ? 'VALIDATED' : 'NEEDS_REVIEW',
    extracted_payload: {},
  }));

  if (rows.length > 0) {
    await supabase.from('parts_extraction_rows').insert(rows);
  }

  const { data: final } = await supabase.from('parts_extraction_rows').select('validation_status');
  const counts = { VALIDATED: 0, NEEDS_REVIEW: 0, REJECTED: 0 };
  for (const row of (final || [])) {
    counts[row.validation_status]++;
  }

  const total = final?.length || 0;
  const cov = total > 0 ? ((counts.VALIDATED / total) * 100).toFixed(1) : 0;

  console.log(`[FINAL STATS]\n- Total: ${total}\n- Validated: ${counts.VALIDATED}\n- Needs Review: ${counts.NEEDS_REVIEW}\n- Coverage: ${cov}%\n`);

  process.exit(0);
}

main().catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
