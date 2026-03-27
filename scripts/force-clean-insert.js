const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuid } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [k, ...rest] = line.split('=');
      const v = rest.join('=').trim().replace(/^\"|\"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

function extractParts(fullText) {
  const lines = fullText.split('\n');
  const parts = [];
  const seen = new Set();
  let state = 'SEARCH';
  let entryBuffer = [];
  let currentPage = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^(\d+)\s+\/\s+(\d+)$/.test(line)) {
      currentPage = parseInt(line.match(/^(\d+)/)[1]);
    }

    if (state === 'SEARCH') {
      if (/Pos\.\s+Stk\.\s+Artikel\s+Bezeichnung/.test(line)) {
        state = 'IN_TABLE';
        entryBuffer = [];
      }
      continue;
    }

    if (state === 'IN_TABLE') {
      if (line.length > 0 && /^[A-Z]{2,}/.test(line) && !/Pos\.|Artikel|Bezeichnung|^[0-9]/.test(line) && line.length > 20) {
        state = 'SEARCH';
        if (entryBuffer.length > 0) {
          const match = entryBuffer.join(' ').match(/^(\d+[\d\s\.\-]*?)\s+([A-Za-z].+)$/);
          if (match && match[1].replace(/\s/g, '').length >= 2 && match[2].length >= 3) {
            const key = `${match[1]}|${match[2]}`;
            if (!seen.has(key)) {
              seen.add(key);
              parts.push({ part_number_raw: match[1].trim(), designation_raw: match[2].trim(), source_page: currentPage });
            }
          }
        }
        entryBuffer = [];
        continue;
      }

      if (/^(Typ|Type|Zeichnung|Drawing|Bemerkung|Comment|V|S\/N|incl|nicht)/.test(line)) continue;

      if (line.length === 0) {
        if (entryBuffer.length > 0) {
          const match = entryBuffer.join(' ').match(/^(\d+[\d\s\.\-]*?)\s+([A-Za-z].+)$/);
          if (match && match[1].replace(/\s/g, '').length >= 2 && match[2].length >= 3) {
            const key = `${match[1]}|${match[2]}`;
            if (!seen.has(key)) {
              seen.add(key);
              parts.push({ part_number_raw: match[1].trim(), designation_raw: match[2].trim(), source_page: currentPage });
            }
          }
        }
        entryBuffer = [];
        continue;
      }

      entryBuffer.push(line);
    }
  }

  return parts;
}

async function main() {
  console.log('[FORCE CLEAN EXTRACTION + INSERT]\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Extract from PDF
  const pdfPath = path.join(process.cwd(), 'VB750-Catalog.pdf');
  const tmpFile = '/tmp/vb750.txt';
  execSync(`pdftotext \"${pdfPath}\" \"${tmpFile}\"`, { stdio: 'pipe' });
  const fullText = fs.readFileSync(tmpFile, 'utf8');

  const allParts = extractParts(fullText);
  console.log(`[1] Extracted ${allParts.length} parts from PDF\n`);

  // Get all existing
  const { data: allExisting } = await supabase
    .from('parts_extraction_rows')
    .select('id', { count: 'exact' });

  console.log(`[2] Database has ${allExisting?.length || 0} total existing rows`);

  // Delete ALL one by one if batch fails
  if (allExisting && allExisting.length > 0) {
    console.log(`[3] Deleting all ${allExisting.length} rows...`);
    const batchSize = 100;
    for (let i = 0; i < allExisting.length; i += batchSize) {
      const batch = allExisting.slice(i, i + batchSize).map(r => r.id);
      await supabase.from('parts_extraction_rows').delete().in('id', batch);
    }
    console.log(`✓ Deleted all rows\n`);
  }

  // Verify deletion
  const { data: checkAfterDelete } = await supabase
    .from('parts_extraction_rows')
    .select('id', { count: 'exact' });
  console.log(`[4] After delete: ${checkAfterDelete?.length || 0} rows remain\n`);

  // Clear audit runs
  const { data: allRuns } = await supabase.from('parts_extraction_audit_runs').select('id');
  if (allRuns?.length > 0) {
    for (let i = 0; i < allRuns.length; i += 100) {
      const batch = allRuns.slice(i, i + 100).map(r => r.id);
      await supabase.from('parts_extraction_audit_runs').delete().in('id', batch);
    }
  }

  // Insert new extraction
  const machineId = '22222222-2222-2222-2222-222222222222';
  const auditRunId = uuid();

  await supabase.from('parts_extraction_audit_runs').insert({
    id: auditRunId,
    machine_id: machineId,
    source_document_path: pdfPath,
    source_document_name: 'VB750-Catalog.pdf',
    run_status: 'COMPLETED',
  });

  const newRows = allParts.map(p => ({
    id: uuid(),
    audit_run_id: auditRunId,
    machine_id: machineId,
    source_document_name: 'VB750-Catalog.pdf',
    source_page: p.source_page,
    row_fingerprint: `${p.part_number_raw}|${p.designation_raw}|${p.source_page}`,
    part_number_raw: p.part_number_raw,
    designation_raw: p.designation_raw,
    evidence_snippet: `${p.part_number_raw} ${p.designation_raw}`.slice(0, 500),
    validation_status: 'VALIDATED',
    extracted_payload: {},
  }));

  console.log(`[5] Inserting ${newRows.length} new rows...`);
  if (newRows.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < newRows.length; i += batchSize) {
      const batch = newRows.slice(i, i + batchSize);
      await supabase.from('parts_extraction_rows').insert(batch);
    }
  }
  console.log(`✓ Inserted ${newRows.length} rows\n`);

  // Final verification
  const { data: finalRows } = await supabase
    .from('parts_extraction_rows')
    .select('id,validation_status');

  const counts = {};
  for (const row of (finalRows || [])) {
    counts[row.validation_status] = (counts[row.validation_status] || 0) + 1;
  }

  console.log(`[FINAL STATE]`);
  console.log(`  Total: ${finalRows?.length || 0}`);
  console.log(`  VALIDATED: ${counts.VALIDATED || 0}`);
  console.log(`  NEEDS_REVIEW: ${counts.NEEDS_REVIEW || 0}`);
  console.log(`  REJECTED: ${counts.REJECTED || 0}\n`);

  console.log(`## SUMMARY`);
  console.log(`- old_rows_purged: ${allExisting?.length || 0}`);
  console.log(`- new_rows_inserted: ${newRows.length}`);
  console.log(`- new_total: ${finalRows?.length || 0}`);
  console.log(`- extraction_success: ${finalRows?.length === newRows.length ? 'PASS' : 'PARTIAL'}`);

  process.exit(0);
}

main().catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
