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

function extractParts(text) {
  const lines = text.split('\n');
  const parts = [];
  let inTable = false;
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect table start
    if (/Pos\.\s+Stk\.\s+Artikel/.test(line)) {
      inTable = true;
      buffer = [];
      continue;
    }

    // Detect table end
    if (inTable && line.length > 0 && /^[A-Z]/.test(line) && !line.match(/^[0-9]/)) {
      // Looks like a new section
      if (!/Pos\.|Stk\.|Artikel|Bezeichnung|Type|Drawing|Bemerkung|Comment|Zeichnung|Option/i.test(line)) {
        inTable = false;
      }
    }

    if (!inTable) continue;

    // Collect non-empty lines
    if (line.length > 0) {
      buffer.push(line);
    } else {
      // Process buffer when we hit an empty line
      if (buffer.length >= 2) {
        const part = parsePartFromBuffer(buffer);
        if (part) {
          parts.push(part);
        }
      }
      buffer = [];
    }
  }

  // Process any remaining buffer
  if (buffer.length >= 2) {
    const part = parsePartFromBuffer(buffer);
    if (part) {
      parts.push(part);
    }
  }

  return parts;
}

function parsePartFromBuffer(buffer) {
  // Skip if contains known metadata
  const text = buffer.join(' ');
  if (/Bemerkung|Comment|Typ|Type|Zeichnung|Drawing|^[A-Z]{2,}\s+Recycling|^HAMMEL|^Siehe|^See|S\/N/.test(text)) {
    return null;
  }

  // Skip if looks like a position marker alone
  if (buffer.length === 1 && /^[\d\.]+$/.test(buffer[0])) {
    return null;
  }

  // Skip if just metadata labels
  if (/^(V|incl\.|nicht|option)$/i.test(text)) {
    return null;
  }

  // Try to find part number and designation
  let partNum = null;
  let designation = null;

  // Strategy: look for numeric patterns as part numbers
  for (const line of buffer) {
    // Part number: mostly digits with possible spaces/dashes (e.g., "811", "17515 Axial...", "0752 02 15 00 01 1")
    if (/^\d+[\s\d\-\.]*(\s+[A-Za-z])?/.test(line)) {
      const match = line.match(/^([\d\s\-\.]+)\s+(.+)$/);
      if (match && match[1].replace(/\s+/g, '').length >= 3) {
        partNum = match[1].trim();
        designation = match[2].trim();
        break;
      } else if (/^\d+[\d\s\-\.]+$/.test(line) && line.replace(/\s+/g, '').length >= 3) {
        partNum = line;
      }
    }
  }

  // If we have part number but no designation yet, use remaining buffer
  if (partNum && !designation) {
    // Find lines after the part number line
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i].startsWith(partNum) || buffer[i].includes(partNum)) {
        // Use following lines as designation
        const rest = buffer.slice(i + 1).join(' ').trim();
        if (rest && rest.length > 2) {
          designation = rest;
        }
        break;
      }
    }
  }

  // If still no designation, try to extract from descriptive lines
  if (!designation) {
    for (const line of buffer) {
      if (/[A-Za-z]{3,}/.test(line) && !line.match(/^[\d\s\-\.]+$/)) {
        designation = line;
        break;
      }
    }
  }

  if (partNum && designation) {
    return { partNum: partNum.trim(), designation: designation.trim() };
  }

  return null;
}

async function main() {
  console.log('[PDF EXTRACTION V3]');
  console.log('===================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const pdfPath = path.join(ROOT, 'VB750-Catalog.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.log(`✗ PDF not found`);
    process.exit(1);
  }

  const tmpFile = '/tmp/vb750.txt';
  execSync(`pdftotext \"${pdfPath}\" \"${tmpFile}\"`, { stdio: 'pipe' });

  const fullText = fs.readFileSync(tmpFile, 'utf8');
  const parts = extractParts(fullText);

  console.log(`✓ Extracted ${parts.length} parts\n`);
  if (parts.length > 0) {
    console.log('Samples:');
    for (const p of parts.slice(0, 8)) {
      console.log(`  ${p.partNum} | ${p.designation}`);
    }
    console.log();
  }

  // Clear and insert
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
    validation_status: (p.partNum.length >= 3 && p.designation.length >= 5) ? 'VALIDATED' : 'NEEDS_REVIEW',
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

  console.log(`\nFinal: ${final?.length || 0} total | Validated: ${counts.VALIDATED} | Needs Review: ${counts.NEEDS_REVIEW} | Rejected: ${counts.REJECTED}`);
  process.exit(0);
}

main().catch(err => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
