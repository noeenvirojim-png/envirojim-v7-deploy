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
      const v = rest.join('=').trim().replace(/^\"|\"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

async function main() {
  console.log('[AGGRESSIVE HARDENING - REJECT NON-PARTS]');
  console.log('========================================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Load all NEEDS_REVIEW rows
  console.log('[ÉTAPE 1] LOAD NEEDS_REVIEW ROWS');
  const { data: needsReview } = await supabase
    .from('parts_extraction_rows')
    .select('id,part_number_raw,designation_raw,evidence_snippet')
    .eq('validation_status', 'NEEDS_REVIEW');

  const total = needsReview?.length || 0;
  console.log(`✓ Loaded ${total} NEEDS_REVIEW rows\n`);

  // Aggressive rejection rules
  console.log('[ÉTAPE 2] APPLY REJECTION RULES');
  const machineId = '22222222-2222-2222-2222-222222222222';
  const orgId = '11111111-1111-1111-1111-111111111111';

  const rejectReasons = {};
  let rejectedCount = 0;

  for (const row of (needsReview || [])) {
    let rejectReason = null;
    const snippet = (row.evidence_snippet || '').trim().toLowerCase();
    const partNum = (row.part_number_raw || '').trim();
    const desig = (row.designation_raw || '').trim();

    // Rule 1: No designation at all = definitely not a real part
    if (!desig || desig === 'null') {
      rejectReason = 'no_designation_field';
    }
    // Rule 2: Designation is extremely short
    else if (desig.length < 2) {
      rejectReason = 'designation_too_short';
    }
    // Rule 3: Part number without substance
    else if (!partNum || partNum.length < 2) {
      rejectReason = 'no_meaningful_part_number';
    }
    // Rule 4: Obvious metadata patterns in designation
    else if (/^(seite|page|datum|date|typ|type|zeichnung|drawing|bemerkung|comment|pos\.|qty|stk\.|artikel|designation|pos |stk |no\.|nr\.|v )$/i.test(desig)) {
      rejectReason = 'metadata_label';
    }
    // Rule 5: Only single-digit numbers as part number
    else if (/^[\d\s\.]{1,3}$/.test(partNum)) {
      rejectReason = 'numeric_only_trivial';
    }
    // Rule 6: Section headers or structure markers
    else if (/^([0-9]+\.\s+)?(allgemeine|general|chassis|antrieb|drive|hackwerk|shredding|hopper|magnet|electrical|system|ausf|execution)$/.test(desig)) {
      rejectReason = 'section_header';
    }
    // Rule 7: Document metadata
    else if (/^(hammel|recycling|gmbh|copyright|assembled|illustrated|year of build|year build|monat|baujahr|dokument|document)$/i.test(desig)) {
      rejectReason = 'document_metadata';
    }
    // Rule 8: Form labels or table structure
    else if (/^(bemerkung|comment|bezeichnung|seite|see|page|typ|drawing|artikel|pos|qty|stk)$/i.test(desig)) {
      rejectReason = 'form_label';
    }
    // Rule 9: Very long generic section text
    else if (desig.length > 100 && /^(the|die|reprä|serve|illustr|correspond|beschrei|Einhausung|Chassis|Antriebseinheit)/.test(desig)) {
      rejectReason = 'generic_description_block';
    }
    // Rule 10: Obvious non-English/German text or warnings
    else if (/warn|caution|achtung|gefahr|danger/i.test(desig) && desig.length > 50) {
      rejectReason = 'warning_text';
    }

    if (rejectReason) {
      await supabase.from('parts_review_decisions').insert({
        id: uuid(),
        extraction_row_id: row.id,
        machine_id: machineId,
        organization_id: orgId,
        decision_status: 'REJECTED',
        rationale: `Auto-reject: ${rejectReason}`,
        is_active: true,
      });
      rejectedCount++;
      rejectReasons[rejectReason] = (rejectReasons[rejectReason] || 0) + 1;
    }
  }

  console.log(`✓ Auto-rejected ${rejectedCount} rows\n`);
  console.log('Rejection breakdown:');
  for (const [reason, count] of Object.entries(rejectReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${reason}: ${count}`);
  }
  console.log();

  // Final stats
  console.log('[ÉTAPE 3] FINAL STATE');
  const { data: finalRows } = await supabase
    .from('parts_extraction_rows')
    .select('id,validation_status,parts_review_decisions!left(id,decision_status,is_active)');

  let validated = 0, needsReviewRemaining = 0, rejected = 0;
  for (const row of (finalRows || [])) {
    if (row.validation_status === 'VALIDATED') {
      validated++;
    } else if (row.validation_status === 'REJECTED') {
      rejected++;
    } else if (row.validation_status === 'NEEDS_REVIEW') {
      const active = (row.parts_review_decisions || []).find(d => d.is_active);
      if (active && active.decision_status === 'REJECTED') {
        rejected++;
      } else {
        needsReviewRemaining++;
      }
    }
  }

  const totalFinal = finalRows?.length || 0;
  const coverage = totalFinal > 0 ? ((validated / totalFinal) * 100).toFixed(1) : 0;

  console.log(`- Total: ${totalFinal}`);
  console.log(`- Validated: ${validated}`);
  console.log(`- Needs review (genuine): ${needsReviewRemaining}`);
  console.log(`- Rejected: ${rejected}`);
  console.log(`- Coverage: ${coverage}%\n`);

  const verdict = {
    extracted_total: totalFinal,
    validated: validated,
    remaining_needs_review: needsReviewRemaining,
    rejected_count: rejected,
    safe_truth_coverage_percent: parseFloat(coverage),
    production_ready: needsReviewRemaining <= 50 && coverage >= 30,
  };

  fs.mkdirSync(path.join(ROOT, 'artifacts/hardening-aggressive'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'artifacts/hardening-aggressive/result.json'),
    JSON.stringify(verdict, null, 2)
  );

  console.log(`## RESULT`);
  console.log(`- aggressive_rejection_applied: YES`);
  console.log(`- rows_rejected_as_non_parts: ${rejectedCount}`);
  console.log(`- genuine_needs_review_remaining: ${needsReviewRemaining}`);
  console.log(`- production_ready: ${verdict.production_ready ? 'YES' : 'NO'}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error(`✗ Error: ${err.message}`);
  process.exit(1);
});
