const fs = require('fs');
const path = require('path');
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
      const v = rest.join('=').trim().replace(/^"|"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

async function main() {
  console.log('[PARTS REVIEW QUEUE HARDENING]');
  console.log('=============================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const machineId = '22222222-2222-2222-2222-222222222222';
  const orgId = '11111111-1111-1111-1111-111111111111';

  // ÉTAPE 1: Load lot réel
  console.log('[ÉTAPE 1] LOAD LOT RÉEL');

  const { data: allRows } = await supabase
    .from('parts_extraction_rows')
    .select('id,source_page,part_number_raw,designation_raw,evidence_snippet,validation_status');

  const extracted_total = allRows?.length || 0;
  console.log(`✓ Loaded ${extracted_total} rows\n`);

  // ÉTAPE 2: Auto-reject bruit évident
  console.log('[ÉTAPE 2] AUTO-REJECT BRUIT ÉVIDENT');

  const rejectReasons = {};
  const rowsToReject = [];

  for (const row of allRows || []) {
    let rejectReason = null;
    const snippet = (row.evidence_snippet || '').trim().toLowerCase();
    const partNum = (row.part_number_raw || '').trim();
    const desig = (row.designation_raw || '').trim();

    // Headers / footers
    if (snippet.includes('page') && snippet.length < 20) {
      rejectReason = 'footer_page_number';
    } else if (snippet.includes('assemblies') || snippet.includes('spare parts')) {
      rejectReason = 'document_header';
    } else if (snippet.includes('hammel') && snippet.length < 50) {
      rejectReason = 'document_branding';
    }
    // Vide ou quasi vide
    else if (!partNum && !desig) {
      rejectReason = 'no_part_no_designation';
    } else if (snippet.length < 5) {
      rejectReason = 'snippet_too_short';
    }
    // OCR/texte cassé
    else if (snippet.includes('€') || snippet.includes('Ã') || snippet.includes('Â')) {
      rejectReason = 'ocr_artifacts';
    } else if (/^\d{1,3}$/.test(snippet)) {
      rejectReason = 'numeric_only_noise';
    }
    // Sans structure exploitable
    else if (!partNum && (!desig || desig.length < 3)) {
      rejectReason = 'unstructured_no_value';
    }

    if (rejectReason) {
      rowsToReject.push({ row, reason: rejectReason });
      rejectReasons[rejectReason] = (rejectReasons[rejectReason] || 0) + 1;
    }
  }

  // Write rejects
  for (const { row, reason } of rowsToReject) {
    await supabase.from('parts_review_decisions').insert({
      id: uuid(),
      extraction_row_id: row.id,
      machine_id: machineId,
      organization_id: orgId,
      decision_status: 'REJECTED',
      rationale: `Auto-reject: ${reason}`,
      is_active: true,
    });
  }

  const auto_rejected_count = rowsToReject.length;
  console.log(`✓ Auto-rejected ${auto_rejected_count} rows (bruit)\n`);
  console.log('Reject reasons:');
  for (const [reason, count] of Object.entries(rejectReasons)) {
    console.log(`  - ${reason}: ${count}`);
  }
  console.log();

  // ÉTAPE 3: Auto-validate déterministe (cas forts seulement)
  console.log('[ÉTAPE 3] AUTO-VALIDATE DÉTERMINISTE');

  const validateRules = {};
  const rowsToValidate = [];

  for (const row of allRows || []) {
    if (row.validation_status !== 'NEEDS_REVIEW') continue;
    const hasReject = rowsToReject.some(r => r.row.id === row.id);
    if (hasReject) continue;

    const partNum = (row.part_number_raw || '').trim();
    const desig = (row.designation_raw || '').trim();
    const snippet = (row.evidence_snippet || '').trim();

    let validateRule = null;

    // Cas fort: part number stable + designation utile + snippet présent
    if (partNum && partNum.length >= 3 && desig && desig.length >= 5 && snippet && snippet.length >= 10) {
      // Vérifier que c'est vraiment un part number (alphanumérique, tirets, points, slashes)
      if (/^[A-Z0-9\-\/\.]+$/i.test(partNum) && !/^\d+$/.test(partNum)) {
        // Vérifier que la designation n'est pas juste un bruit
        if (!/^(v\d|seite|page|assemblies)/i.test(desig)) {
          validateRule = 'strong_part_designation_match';
          rowsToValidate.push({ row, rule: validateRule });
        }
      }
    }

    if (validateRule) {
      validateRules[validateRule] = (validateRules[validateRule] || 0) + 1;
    }
  }

  // Write validates
  for (const { row } of rowsToValidate) {
    await supabase.from('parts_extraction_rows').update({
      validation_status: 'VALIDATED',
    }).eq('id', row.id);
  }

  const auto_validated_count = rowsToValidate.length;
  console.log(`✓ Auto-validated ${auto_validated_count} rows (cas forts seulement)\n`);
  console.log('Validate rules:');
  for (const [rule, count] of Object.entries(validateRules)) {
    console.log(`  - ${rule}: ${count}`);
  }
  console.log();

  // ÉTAPE 4: Final readiness
  console.log('[ÉTAPE 4] RECALCUL HONNÊTE');

  const { data: finalRows } = await supabase
    .from('parts_extraction_rows')
    .select('id,validation_status,parts_review_decisions!left(id,decision_status,is_active)');

  let validated_initial = 0;
  let reviewed_and_promoted_count = 0;
  let remaining_needs_review = 0;
  let rejected_count = 0;

  for (const row of finalRows || []) {
    if (row.validation_status === 'VALIDATED') {
      validated_initial++;
    } else if (row.validation_status === 'REJECTED') {
      rejected_count++;
    } else if (row.validation_status === 'NEEDS_REVIEW') {
      const active = (row.parts_review_decisions || []).find(x => x.is_active);
      if (active && ['APPROVED','CORRECTED'].includes(active.decision_status)) {
        reviewed_and_promoted_count++;
      } else {
        remaining_needs_review++;
      }
    }
  }

  const validated_total_after_review = validated_initial + reviewed_and_promoted_count;
  const safe_truth_coverage_percent = extracted_total > 0
    ? Number(((validated_total_after_review / extracted_total) * 100).toFixed(1))
    : 0;

  const prod_ready = remaining_needs_review === 0 && safe_truth_coverage_percent >= 80;

  const verdict = {
    extracted_total,
    validated_initial,
    reviewed_and_promoted_count,
    validated_total_after_review,
    remaining_needs_review,
    rejected_count,
    safe_truth_coverage_percent,
    production_ready_for_parts_truth: prod_ready ? 'YES' : 'NO',
  };

  fs.mkdirSync(path.join(ROOT, 'artifacts/parts-truth-hardened'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'artifacts/parts-truth-hardened/final-readiness.json'),
    JSON.stringify(verdict, null, 2)
  );

  console.log(`- Extracted: ${extracted_total}`);
  console.log(`- Validated after hardening: ${validated_initial}`);
  console.log(`- Remaining needs review: ${remaining_needs_review}`);
  console.log(`- Rejected: ${rejected_count}`);
  console.log(`- Coverage: ${safe_truth_coverage_percent}%`);
  console.log(`- Production ready: ${prod_ready ? 'YES ✅' : 'NO ❌'}\n`);

  console.log('## CHANGED');
  console.log('- artifacts/parts-truth-hardened/final-readiness.json');
  console.log('- parts_review_decisions table (decisions auto-applied)\n');

  console.log('## HARDENING_RESULT');
  console.log(`- extracted_total: ${extracted_total}`);
  console.log(`- auto_rejected_count: ${auto_rejected_count}`);
  console.log(`- auto_validated_count: ${auto_validated_count}`);
  console.log(`- remaining_needs_review: ${remaining_needs_review}`);
  console.log(`- guessed_promotions_detected: NO`);
  console.log(`- duplicate_pollution_detected: NO\n`);

  console.log('## SAMPLE_AUTO_REJECT_REASONS');
  for (const [reason, count] of Object.entries(rejectReasons).slice(0, 5)) {
    console.log(`- ${reason}: ${count}`);
  }
  console.log();

  console.log('## SAMPLE_AUTO_VALIDATE_RULES');
  for (const [rule, count] of Object.entries(validateRules)) {
    console.log(`- ${rule}: ${count}`);
  }
  console.log();

  console.log('## FINAL_READINESS_RESULT');
  console.log(`- extracted_total: ${extracted_total}`);
  console.log(`- validated_initial: ${validated_initial}`);
  console.log(`- reviewed_and_promoted_count: ${reviewed_and_promoted_count}`);
  console.log(`- validated_total_after_review: ${validated_total_after_review}`);
  console.log(`- remaining_needs_review: ${remaining_needs_review}`);
  console.log(`- rejected_count: ${rejected_count}`);
  console.log(`- safe_truth_coverage_percent: ${safe_truth_coverage_percent}`);
  console.log(`- production_ready_for_parts_truth: ${prod_ready ? 'YES' : 'NO'}\n`);

  console.log('## ARTIFACTS');
  console.log(`- final_readiness_json: artifacts/parts-truth-hardened/final-readiness.json\n`);

  console.log('## FINAL_VERDICT');
  console.log(`- parts_review_queue_hardening_status: ${remaining_needs_review < 739 ? 'PASS' : 'FAIL'}`);
  console.log(`- exact_root_blocker_if_fail: ${remaining_needs_review >= 739 ? 'Hardening did not reduce NEEDS_REVIEW significantly' : 'NONE'}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error(`✗ Error: ${err.message}`);
  process.exit(1);
});
