import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

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

function fp(partNumber, designation, page) {
  return crypto.createHash('sha256').update(`${partNumber || ''}|${designation || ''}|${page || ''}`).digest('hex');
}

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select('*').limit(1);
  return !error;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from('parts_extraction_rows')
    .select(`
      id,
      machine_id,
      organization_id,
      source_page,
      evidence_snippet,
      part_number_raw,
      designation_raw,
      qty,
      notes,
      validation_status,
      parts_review_decisions!left(
        id,
        decision_status,
        corrected_part_number,
        corrected_designation,
        corrected_qty,
        corrected_notes,
        rationale,
        is_active
      )
    `)
    .eq('validation_status', 'NEEDS_REVIEW');

  if (error) throw error;

  const active = (rows || []).map(r => {
    const decision = (r.parts_review_decisions || []).find(d => d.is_active);
    return { row: r, decision };
  }).filter(x => x.decision && ['APPROVED','CORRECTED'].includes(x.decision.decision_status));

  const promotions = active.map(({ row, decision }) => {
    const part_number = decision.decision_status === 'CORRECTED' ? (decision.corrected_part_number || row.part_number_raw) : row.part_number_raw;
    const designation = decision.decision_status === 'CORRECTED' ? (decision.corrected_designation || row.designation_raw) : row.designation_raw;
    const qty = decision.decision_status === 'CORRECTED' ? (decision.corrected_qty ?? row.qty) : row.qty;
    const notes = decision.decision_status === 'CORRECTED' ? (decision.corrected_notes || row.notes) : row.notes;
    return {
      extraction_row_id: row.id,
      machine_id: row.machine_id,
      organization_id: row.organization_id,
      part_number,
      designation,
      qty,
      notes,
      source_page: row.source_page,
      evidence_snippet: row.evidence_snippet,
      row_fingerprint: fp(part_number, designation, row.source_page),
      decision_status: decision.decision_status,
      rationale: decision.rationale || null,
    };
  });

  fs.mkdirSync(path.join(ROOT, 'artifacts/bloc-j'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'artifacts/bloc-j/review-promotions.json'), JSON.stringify(promotions, null, 2));

  const hasCanonical = await tableExists(supabase, 'machine_kb_entities');
  let persisted = false;

  if (hasCanonical && promotions.length > 0) {
    // Only if project already uses machine_kb_entities for parts truth.
    const payload = promotions.map(p => ({
      machine_id: p.machine_id,
      kb_id: null,
      entity_type: 'part',
      canonical_name: p.designation,
      normalized_payload: {
        part_number: p.part_number,
        designation: p.designation,
        qty: p.qty,
        notes: p.notes,
        source_page: p.source_page,
        evidence_snippet: p.evidence_snippet,
        promoted_from_review: true,
        extraction_row_id: p.extraction_row_id,
        rationale: p.rationale,
      }
    }));

    const { error: insertError } = await supabase.from('machine_kb_entities').insert(payload);
    persisted = !insertError;
  }

  fs.writeFileSync(
    path.join(ROOT, 'artifacts/bloc-j/review-promotions-summary.json'),
    JSON.stringify({ promotion_count: promotions.length, persisted }, null, 2)
  );

  console.log(JSON.stringify({ promotion_count: promotions.length, persisted }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
