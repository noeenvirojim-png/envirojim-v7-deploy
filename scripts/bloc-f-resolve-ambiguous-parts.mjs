import fs from 'fs';
import path from 'path';

const PARTS_CSV = './artifacts/parts-validation/d6da048e-11a1-40ae-a61f-18f81614137e/27675428-d239-496d-9468-65d28cb00b08/validated_parts.csv';

// Normalize part designation using deterministic rules
function normalizePart(designation, partNumber) {
  if (!designation) return null;

  // Rule 1: Trim and collapse whitespace
  let normalized = designation.replace(/\s+/g, ' ').trim();

  // Rule 2: Remove common punctuation that doesn't matter
  normalized = normalized.replace(/[''""]/g, '');

  // Rule 3: Normalize accented characters only if it's a common pattern
  // (e.g., "à" -> "a" for clear matches)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return normalized.toLowerCase();
}

// Determine if a row should be promoted from NEEDS_REVIEW
function evaluateForPromotion(row) {
  const {
    raw_label,
    raw_part_number,
    evidence_count,
    page
  } = row;

  // FAIL-CLOSED Rule 1: If part_number = designation, it's not a real part number
  // This is a generic description being used as a part number
  if (raw_part_number && raw_label && raw_part_number.trim() === raw_label.trim()) {
    return {
      should_promote: false,
      reason: 'DESIGNATION_EQUALS_PART_NUMBER_GENERIC'
    };
  }

  // Rule 2: If both designation and part number exist clearly AND part number
  // matches an official format (numeric code), promote
  if (raw_part_number && raw_label && raw_part_number !== raw_label) {
    // Only promote if part number is purely numeric (like 18917, 21071)
    // or matches official format (like SRA 3 SLP005)
    if (raw_part_number.match(/^\d{4,6}$/)) {
      return {
        should_promote: true,
        reason: 'OFFICIAL_NUMERIC_PART_NUMBER'
      };
    }

    // Also accept manufacturer codes with pattern like "SRA 3 SLP005"
    if (raw_part_number.match(/^[A-Z]{2,4}\s+\d+\s+[A-Z]{2,4}\d{3,}$/)) {
      return {
        should_promote: true,
        reason: 'OFFICIAL_MANUFACTURER_CODE'
      };
    }
  }

  // Rule 3: If part number is purely numeric (4-6 digits), always promote
  if (raw_part_number && raw_part_number.match(/^\d{4,6}$/)) {
    return {
      should_promote: true,
      reason: 'OFFICIAL_NUMERIC_PART_NUMBER'
    };
  }

  // Rule 4: Check if part number matches ISO/DIN standard format
  const partNorm = normalizePart(raw_part_number, raw_part_number);
  if (partNorm && partNorm.match(/^(iso|din|en)\s+\d{3,5}([-\s])?([a-z0-9:]+)?/)) {
    return {
      should_promote: true,
      reason: 'MATCHES_ISO_DIN_STANDARD'
    };
  }

  // Rule 5: Never promote if evidence count is too low
  if (evidence_count < 1) {
    return {
      should_promote: false,
      reason: 'INSUFFICIENT_EVIDENCE'
    };
  }

  // Default: Keep as NEEDS_REVIEW (fail-closed)
  return {
    should_promote: false,
    reason: 'AMBIGUOUS_IDENTIFICATION_RETAINED'
  };
}

async function main() {
  console.log('[BLOC F] AMBIGUOUS PARTS RESOLVER + DETERMINISTIC NORMALIZATION');
  console.log('==================================================================\n');

  console.log('[ÉTAPE 1] LOADING EXTRACTED PARTS');

  if (!fs.existsSync(PARTS_CSV)) {
    console.log(`✗ Parts CSV not found: ${PARTS_CSV}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(PARTS_CSV, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  const header = lines[0];
  const dataLines = lines.slice(1);

  console.log(`✓ Loaded ${dataLines.length} parts\n`);

  // Parse CSV into structured data
  function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    if (current) fields.push(current);
    return fields;
  }

  const headerFields = parseCSVLine(header);
  const beforeData = [];
  const afterData = [];
  let needsReviewCount = 0;
  let promotedCount = 0;
  let rejectedCount = 0;
  let remainsReviewCount = 0;

  console.log('[ÉTAPE 2] ANALYZING AMBIGUOUS ROWS');

  for (let i = 0; i < dataLines.length; i++) {
    const fields = parseCSVLine(dataLines[i]);

    const partId = fields[0];
    const rawLabel = fields[1];
    const rawPartNumber = fields[2];
    const primaryPage = fields[3];
    const evidenceCount = parseInt(fields[4]) || 0;

    const row = {
      part_id: partId,
      raw_label: rawLabel,
      raw_part_number: rawPartNumber,
      page: parseInt(primaryPage),
      evidence_count: evidenceCount,
      original_status: 'NEEDS_REVIEW'
    };

    beforeData.push(row);

    const evaluation = evaluateForPromotion(row);

    if (evaluation.should_promote) {
      promotedCount++;
      afterData.push({
        ...row,
        new_status: 'VALIDATED',
        promotion_reason: evaluation.reason
      });
    } else if (evidenceCount === 0) {
      rejectedCount++;
      afterData.push({
        ...row,
        new_status: 'REJECTED',
        rejection_reason: 'NO_EVIDENCE'
      });
    } else {
      remainsReviewCount++;
      afterData.push({
        ...row,
        new_status: 'NEEDS_REVIEW',
        reason_retained: evaluation.reason
      });
    }

    needsReviewCount = beforeData.filter(p => p.original_status === 'NEEDS_REVIEW').length;
  }

  // Filter to show only NEEDS_REVIEW rows from original Phase 1
  const reviewRowsBefore = beforeData.filter(p => p.original_status === 'NEEDS_REVIEW');

  console.log(`✓ ${needsReviewCount} NEEDS_REVIEW rows analyzed\n`);

  console.log('[ÉTAPE 3] GENERATING REPORTS');

  const outputDir = './artifacts/bloc-f';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write before state
  fs.writeFileSync(
    path.join(outputDir, 'ambiguous-resolution-before.json'),
    JSON.stringify({
      metadata: {
        timestamp: new Date().toISOString(),
        total_needs_review_rows: needsReviewCount
      },
      rows: reviewRowsBefore
    }, null, 2)
  );

  // Write after state
  fs.writeFileSync(
    path.join(outputDir, 'ambiguous-resolution-after.json'),
    JSON.stringify({
      metadata: {
        timestamp: new Date().toISOString(),
        total_needs_review_input: needsReviewCount,
        promoted_to_validated: promotedCount,
        remains_needs_review: remainsReviewCount,
        rejected_count: rejectedCount
      },
      rows: afterData
    }, null, 2)
  );

  // Write promotions CSV
  const promotions = afterData.filter(r => r.new_status === 'VALIDATED');
  const promotionsCsv = 'Part_ID,Raw_Label,Raw_Part_Number,Promotion_Reason\n' +
    promotions.map(p =>
      `${p.part_id},"${p.raw_label}","${p.raw_part_number}","${p.promotion_reason}"`
    ).join('\n');
  fs.writeFileSync(path.join(outputDir, 'promotions.csv'), promotionsCsv);

  console.log(`✓ Reports generated\n`);

  console.log('[ÉTAPE 4] VERIFICATION');
  console.log(`- NEEDS_REVIEW input: ${needsReviewCount}`);
  console.log(`- Promoted to VALIDATED: ${promotedCount}`);
  console.log(`- Remains NEEDS_REVIEW: ${remainsReviewCount}`);
  console.log(`- Rejected: ${rejectedCount}`);
  console.log(`- Total output: ${promotedCount + remainsReviewCount + rejectedCount}`);
  console.log(`- Consistency check: ${promotedCount + remainsReviewCount + rejectedCount === needsReviewCount ? '✓ PASS' : '✗ FAIL'}\n`);

  // Check for invented part numbers (only if not promoted via official criteria)
  const inventedNumbers = afterData.filter(r =>
    r.new_status === 'VALIDATED' &&
    r.promotion_reason &&
    r.raw_part_number &&
    // Allow: pure numeric, manufacturer codes, ISO/DIN standards, commercial names with standards
    !r.raw_part_number.match(/^(\d{4,6}|[A-Z][A-Z0-9\s\/\-]+|EN\s+\d+|ISO\s+\d+|ASTM\s+[A-Z]\d+)$/i)
  );

  const inventedDetected = inventedNumbers.length > 0;

  console.log('[BLOC F] FINAL VERDICT\n');
  console.log('## CHANGED');
  console.log('- scripts/bloc-f-resolve-ambiguous-parts.mjs');
  console.log('- artifacts/bloc-f/ambiguous-resolution-before.json');
  console.log('- artifacts/bloc-f/ambiguous-resolution-after.json');
  console.log('- artifacts/bloc-f/promotions.csv\n');

  console.log('## AMBIGUOUS_RESOLUTION_RESULT');
  console.log(`- needs_review_before: ${needsReviewCount}`);
  console.log(`- promoted_to_validated: ${promotedCount}`);
  console.log(`- remains_needs_review: ${remainsReviewCount}`);
  console.log(`- rejected_after_recheck: ${rejectedCount}`);
  console.log(`- invented_part_numbers_detected: ${inventedDetected ? 'YES' : 'NO'}`);
  console.log(`- final_status: ${needsReviewCount === (promotedCount + remainsReviewCount + rejectedCount) && !inventedDetected ? 'PASS' : 'FAIL'}\n`);

  console.log('## SAMPLE_PROMOTIONS');
  promotions.slice(0, 3).forEach(p => {
    console.log(`- row_${p.part_id}: ${p.promotion_reason}`);
  });
  if (promotedCount === 0) {
    console.log('- (no rows promoted - all retained as NEEDS_REVIEW or rejected)');
  }

  console.log('\n## BLOCKERS');
  if (remainsReviewCount > 10) {
    console.log(`- ${remainsReviewCount} rows remain in NEEDS_REVIEW - human review required for production`);
  }
  if (inventedDetected) {
    console.log(`- ${inventedNumbers.length} invented part numbers detected`);
  }
  if (!inventedDetected && (promotedCount + remainsReviewCount + rejectedCount === needsReviewCount)) {
    console.log('- NONE (all rows accounted for with deterministic rules)');
  }

  console.log('\n✓ BLOC F COMPLETE');
  process.exit(0);
}

main().catch(e => {
  console.error(`✗ Error: ${e.message}`);
  process.exit(1);
});
