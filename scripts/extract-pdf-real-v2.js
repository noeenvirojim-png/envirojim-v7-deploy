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

// Extract parts from text by finding table sections
function extractPartsFromText(fullText) {
  const lines = fullText.split('\n');
  const parts = [];
  let inTableSection = false;
  let currentPart = null;
  let tableEntryCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect table start
    if (/Pos\.\s+Stk\.\s+Artikel\s+Bezeichnung/.test(line)) {
      inTableSection = true;
      tableEntryCount = 0;
      continue;
    }

    // Detect table end (new section header or page number)
    if (inTableSection && (/^\d+ \/ \d+$/.test(line) || /^[A-Z]/.test(line) && line.length > 20)) {
      if (currentPart && currentPart.partNum && currentPart.designation) {
        parts.push(currentPart);
      }
      currentPart = null;
      inTableSection = false;
      continue;
    }

    if (!inTableSection) continue;

    // Try to detect start of new part entry (Pos. number)
    if (/^[\d\.]+$/.test(line) && !currentPart) {
      // Save previous part if exists
      if (currentPart && currentPart.partNum && currentPart.designation) {
        parts.push(currentPart);
      }
      currentPart = { pos: line, partNum: null, designation: null, page: 1 };
      tableEntryCount++;
      continue;
    }

    if (!currentPart) continue;

    // Next line after Pos should be quantity (or part of quantity/part number combo)
    if (!currentPart.partNum) {
      // Could be: "1" (qty alone) or "1 811" (qty + part number)
      const parts_match = line.match(/^(\d+)\s+(.*)$/);
      if (parts_match) {
        const qty = parts_match[1];
        const rest = parts_match[2].trim();

        // If there's more after qty, it might be part number
        if (rest.length > 0) {
          currentPart.partNum = rest;
        } else {
          // Qty alone, part number comes next
          currentPart.qty = qty;
        }
      } else if (/^\d+[\d\s\-\.]+$/.test(line)) {
        // Looks like part number (numeric with dashes/dots)
        currentPart.partNum = line;
      } else if (line.length > 0) {
        // Could be designation
        if (!currentPart.designation) {
          currentPart.designation = line;
        } else {
          currentPart.designation += ' ' + line;
        }
      }
      continue;
    }

    // If we have part number but no designation, next non-empty line is designation
    if (!currentPart.designation && line.length > 0) {
      currentPart.designation = line;
      continue;
    }

    // Skip metadata lines (drawing numbers, serial numbers, etc)
    if (/^(Typ|Type|Zeichnungsnr|Drawing|Bemerkung|Comment|S\/N|V|incl\.|nicht)/.test(line)) {
      continue;
    }

    // Empty line might signal end of entry
    if (line.length === 0) {
      if (currentPart && currentPart.partNum && currentPart.designation) {
        parts.push(currentPart);
        currentPart = null;
      }
    }
  }

  // Don't forget last entry
  if (currentPart && currentPart.partNum && currentPart.designation) {
    parts.push(currentPart);
  }

  return parts;
}

async function main() {
  console.log('[PARTS EXTRACTION V2 - REAL PDF]');
  console.log('===============================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Extract PDF
  console.log('[ÉTAPE 1] EXTRACTING PDF TEXT');
  const pdfPath = path.join(ROOT, 'VB750-Catalog.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.log(`✗ PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  const tmpTextFile = '/tmp/vb750-extract.txt';
  try {
    execSync(`pdftotext \"${pdfPath}\" \"${tmpTextFile}\"`, { stdio: 'pipe' });
  } catch (e) {
    console.log(`✗ pdftotext failed: ${e.message}`);
    process.exit(1);
  }

  const fullText = fs.readFileSync(tmpTextFile, 'utf8');
  console.log(`✓ PDF extracted: ${fullText.split('\n').length} lines\n`);

  // Parse parts from tables
  console.log('[ÉTAPE 2] EXTRACTING FROM TABLES');
  const partsList = extractPartsFromText(fullText);
  console.log(`✓ Found ${partsList.length} parts\n`);

  // Show samples
  if (partsList.length > 0) {
    console.log('Sample parts:');
    for (const p of partsList.slice(0, 5)) {
      console.log(`  - ${p.partNum} | ${p.designation}`);
    }
    console.log();
  }

  // Convert to extraction rows
  const extractedRows = partsList.map((p, idx) => ({
    source_page: 1,
    part_number_raw: p.partNum || null,
    designation_raw: p.designation || null,
    evidence_snippet: `${p.partNum} ${p.designation}`.slice(0, 500),
    validation_status: (p.partNum && p.partNum.length >= 3 && p.designation && p.designation.length >= 5) ? 'VALIDATED' : 'NEEDS_REVIEW',
  }));

  // Clear and insert
  console.log('[ÉTAPE 3] PERSISTING TO DATABASE');
  const { data: existingRows } = await supabase.from('parts_extraction_rows').select('id');
  if (existingRows && existingRows.length > 0) {
    const ids = existingRows.map(r => r.id);
    await supabase.from('parts_extraction_rows').delete().in('id', ids);
  }

  const machineId = '22222222-2222-2222-2222-222222222222';
  const orgId = '11111111-1111-1111-1111-111111111111';
  const auditRunId = uuid();

  await supabase.from('parts_extraction_audit_runs').insert({
    id: auditRunId,
    machine_id: machineId,
    source_document_path: pdfPath,
    source_document_name: 'VB750-Catalog.pdf',
    run_status: 'COMPLETED',
  });

  const rowsToInsert = extractedRows.map(row => ({
    id: uuid(),
    audit_run_id: auditRunId,
    machine_id: machineId,
    source_document_name: 'VB750-Catalog.pdf',
    source_page: row.source_page,
    row_fingerprint: `${row.part_number_raw}|${row.designation_raw}|${row.source_page}`,
    part_number_raw: row.part_number_raw,
    designation_raw: row.designation_raw,
    evidence_snippet: row.evidence_snippet,
    validation_status: row.validation_status,
    extracted_payload: {},
  }));

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from('parts_extraction_rows').insert(rowsToInsert);
    if (error) {
      console.log(`✗ Insert error: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`✓ Inserted ${rowsToInsert.length} rows\n`);

  // Query final state
  console.log('[ÉTAPE 4] FINAL STATE');
  const { data: finalRows } = await supabase
    .from('parts_extraction_rows')
    .select('id,validation_status');

  let validated = 0, needsReview = 0, rejected = 0;
  for (const row of (finalRows || [])) {
    if (row.validation_status === 'VALIDATED') validated++;
    else if (row.validation_status === 'NEEDS_REVIEW') needsReview++;
    else if (row.validation_status === 'REJECTED') rejected++;
  }

  const total = finalRows?.length || 0;
  const coverage = total > 0 ? Number(((validated / total) * 100).toFixed(1)) : 0;

  console.log(`- Total: ${total}`);
  console.log(`- Validated: ${validated}`);
  console.log(`- Needs Review: ${needsReview}`);
  console.log(`- Rejected: ${rejected}`);
  console.log(`- Coverage: ${coverage}%\n`);

  process.exit(0);
}

main().catch(err => {
  console.error(`✗ Error: ${err.message}`);
  process.exit(1);
});
