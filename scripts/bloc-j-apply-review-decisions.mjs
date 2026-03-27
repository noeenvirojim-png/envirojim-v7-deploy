import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'artifacts/bloc-j/review-decisions.csv');

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
      const [k, ...rest] = line.split('=');
      const v = rest.join('=').trim().replace(/^"|"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/);
  const headers = rows[0].split(',');
  return rows.slice(1).filter(Boolean).map(line => {
    const out = {};
    let cur = '';
    let vals = [];
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { vals.push(cur); cur = ''; }
      else cur += ch;
    }
    vals.push(cur);
    headers.forEach((h, idx) => out[h] = (vals[idx] || '').trim());
    return out;
  });
}

function validateDecision(row) {
  const allowed = new Set(['APPROVED','CORRECTED','REJECTED','ESCALATED']);
  if (!row.extraction_row_id) throw new Error('Missing extraction_row_id');
  if (!allowed.has(row.decision_status)) throw new Error(`Invalid decision_status: ${row.decision_status}`);
  if (row.decision_status === 'CORRECTED') {
    if (!row.corrected_part_number && !row.corrected_designation) {
      throw new Error(`CORRECTED requires corrected_part_number or corrected_designation for ${row.extraction_row_id}`);
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`);

  const supabase = createClient(url, key);
  const rows = parseCsv(fs.readFileSync(INPUT, 'utf8'));
  rows.forEach(validateDecision);

  let applied = 0;
  const failures = [];

  for (const row of rows) {
    const { data: existing, error: existingError } = await supabase
      .from('parts_extraction_rows')
      .select('id,machine_id,organization_id')
      .eq('id', row.extraction_row_id)
      .single();

    if (existingError || !existing) {
      failures.push({ extraction_row_id: row.extraction_row_id, error: 'ROW_NOT_FOUND' });
      continue;
    }

    const { error: deactivateError } = await supabase
      .from('parts_review_decisions')
      .update({ is_active: false })
      .eq('extraction_row_id', row.extraction_row_id)
      .eq('is_active', true);

    if (deactivateError) {
      failures.push({ extraction_row_id: row.extraction_row_id, error: deactivateError.message });
      continue;
    }

    const payload = {
      extraction_row_id: row.extraction_row_id,
      machine_id: existing.machine_id,
      organization_id: existing.organization_id,
      decision_status: row.decision_status,
      corrected_part_number: row.corrected_part_number || null,
      corrected_designation: row.corrected_designation || null,
      corrected_qty: row.corrected_qty ? Number(row.corrected_qty) : null,
      corrected_notes: row.corrected_notes || null,
      rationale: row.rationale || null,
      is_active: true,
    };

    const { error: insertError } = await supabase
      .from('parts_review_decisions')
      .insert(payload);

    if (insertError) {
      failures.push({ extraction_row_id: row.extraction_row_id, error: insertError.message });
      continue;
    }
    applied++;
  }

  fs.mkdirSync(path.join(ROOT, 'artifacts/bloc-j'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'artifacts/bloc-j/apply-review-decisions-result.json'),
    JSON.stringify({ applied, failures, input_count: rows.length }, null, 2)
  );

  console.log(JSON.stringify({ applied, failure_count: failures.length }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
