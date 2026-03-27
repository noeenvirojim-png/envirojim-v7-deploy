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

// Detect if line is likely a table header
function isTableHeader(line) {
  const lower = line.toLowerCase().trim();
  return /stk|artikel|bezeichnung|qty|part|desc|type|drawing|number|pos|item/i.test(lower) &&
         line.split(/\s{2,}|\t+/).length >= 2;
}

// Detect if in parts table section (between known markers)
function isInPartsSection(text, lineIndex, lines) {
  // Look backward for section start markers
  for (let i = Math.max(0, lineIndex - 50); i < lineIndex; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('stk.') || l.includes('artikel') || l.includes('parts list') || l.includes('bill of materials')) {
      return true;
    }
  }
  return false;
}

// Parse actual part line from table
function parsePartLine(line, pageNum) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return null;

  // Skip if looks like header/label/metadata
  if (isTableHeader(trimmed)) return null;
  if (/^(Typ|Type|Zeichnungsnr|Drawing|Seite|Page|Datum|Date|Monat|Year|Bemerkung|Comment)/i.test(trimmed)) return null;
  if (/^[0-9]+\.\s+(Allgemeine|General|Chassis|Antrieb|Drive|Hackwerk|Shredding|Trichter|Hopper)/i.test(trimmed)) return null;
  if (/^HAMMEL|^Recycling|^Copyright/i.test(trimmed)) return null;

  // Split by multiple spaces or tabs (table structure)
  const tokens = trimmed.split(/\s{2,}|\t+/).map(x => x.trim()).filter(x => x && x.length > 0);
  if (tokens.length < 2) return null;

  // Try to identify part number (typically numeric with dashes)
  // Format: XXXXXXXX-XXXXXXXX-XXXXXXXX or similar patterns
  let partNum = null;
  let designation = null;

  // Look for part number in first few tokens
  for (let i = 0; i < Math.min(tokens.length, 3); i++) {
    const token = tokens[i];
    // Part numbers often: all digits with spaces, dashes, dots: 0750 02 01 02 00 1-20161018
    if (/^\d+[\s\d\-\.]+$/.test(token) && token.length > 6) {
      partNum = token.trim();
      // Designation is remainder
      designation = tokens.slice(i + 1).join(' ').trim();
      break;
    }
  }

  // If no clear part number found, check if line has enough structure
  if (!partNum && tokens.length >= 2) {
    // Might be: [qty] [part] [description]
    // If first token is just a number (qty), skip it
    let startIdx = 0;
    if (/^\d+$/.test(tokens[0]) && tokens.length > 2) startIdx = 1;

    // Take first non-single-char token as part, rest as designation
    if (tokens[startIdx] && tokens[startIdx].length > 2) {
      partNum = tokens[startIdx];
      designation = tokens.slice(startIdx + 1).join(' ').trim();
    }
  }

  if (!partNum) return null;

  // Need both part number and meaningful designation
  if (!designation || designation.length < 3) return null;

  let status = 'NEEDS_REVIEW';
  // Only mark VALIDATED if both are very clear
  if (partNum.length >= 6 && /^\d+[\d\s\-\.]+$/.test(partNum) && designation.length >= 5) {
    status = 'VALIDATED';
  }

  return {
    source_page: pageNum,
    part_number_raw: partNum,
    designation_raw: designation,
    evidence_snippet: trimmed.slice(0, 500),
    validation_status: status,
  };
}

async function main() {
  console.log('[PARTS EXTRACTION - REAL PDF FIXED]');
  console.log('====================================\n');

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
  const lines = fullText.split('\n');
  console.log(`✓ PDF extracted: ${lines.length} lines\n`);

  // Parse parts with better filtering
  console.log('[ÉTAPE 2] PARSING ACTUAL PARTS');
  const extractedRows = [];
  let currentPage = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track page number
    if (/\d+ \/ \d+/.test(line)) {
      const match = line.match(/(\d+) \/ (\d+)/);
      if (match) currentPage = parseInt(match[1]);
    }

    // Only parse if we're in a parts section
    if (isInPartsSection(fullText, i, lines)) {
      const parsed = parsePartLine(line, currentPage);
      if (parsed) {
        extractedRows.push(parsed);
      }
    }
  }

  console.log(`✓ Extracted ${extractedRows.length} parts\n`);

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
    await supabase.from('parts_extraction_rows').insert(rowsToInsert);
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
