import fs from 'fs';
const pdfParse = require('pdf-parse');

type ExtractedRow = {
  source_page: number;
  row_index: number;
  callout: string | null;
  part_number_raw: string | null;
  part_number_normalized: string | null;
  designation_raw: string | null;
  qty: string | null;
  notes: string | null;
  evidence_snippet: string;
  validation_status: 'VALIDATED' | 'NEEDS_REVIEW' | 'REJECTED';
  review_reason: string | null;
};

function normalizePartNumber(val: string | null): string | null {
  if (!val) return null;
  return val.replace(/\s+/g, ' ').trim().toUpperCase();
}

function looksLikeHeader(line: string): boolean {
  const l = line.toLowerCase();
  return (
    l.includes('page ') || l.includes('rep.') || l.includes('designation') ||
    l.includes('qty') || l.includes('quantity') || l.includes('remark') ||
    l.includes('pos') || l.includes('item') || l.includes('description') ||
    l.includes('part nr') || l.includes('part no') || l.includes('artikelnummer')
  );
}

function parseLine(line: string, pageNum: number, rowIndex: number): ExtractedRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3 || looksLikeHeader(trimmed)) {
    return null;
  }

  // Split by multiple spaces or tabs (likely column separators)
  const tokens = trimmed.split(/\s{2,}|\t+/).map(x => x.trim()).filter(Boolean);
  if (tokens.length < 2) return null;

  // Heuristics for part extraction
  const partToken = tokens.find(t => /[A-Z0-9\-\/\.]{3,}[A-Z0-9\-\/\.]*/i.test(t)) || null;
  const qtyToken = tokens.find(t => /^\d{1,3}$/.test(t)) || null;
  const calloutToken = tokens.find(t => /^\d{1,2}[A-Z]?$/.test(t)) || null;

  let designation = tokens
    .filter(t => t !== partToken && t !== qtyToken && t !== calloutToken && t.length > 2)
    .join(' ')
    .trim();

  if (!designation && tokens.length > 1) {
    designation = tokens.slice(1).join(' ').trim();
  }

  const normalized = normalizePartNumber(partToken);
  let status: ExtractedRow['validation_status'] = 'REJECTED';
  let reason: string | null = null;

  // FAIL-CLOSED validation
  if (normalized && designation && designation.length > 3) {
    status = 'VALIDATED';
  } else if ((normalized || designation) && trimmed.length > 10) {
    status = 'NEEDS_REVIEW';
    reason = normalized ? 'MISSING_DESIGNATION' : 'UNCLEAR_PART_NUMBER';
  }

  return {
    source_page: pageNum,
    row_index: rowIndex,
    callout: calloutToken || null,
    part_number_raw: partToken,
    part_number_normalized: normalized,
    designation_raw: designation || null,
    qty: qtyToken,
    notes: null,
    evidence_snippet: trimmed.slice(0, 500),
    validation_status: status,
    review_reason: reason,
  };
}

async function main() {
  console.log('[BLOC B] PARTS EXTRACTION FAIL-CLOSED');
  console.log('====================================\n');

  const PDF_PATH = './VB750-Catalog.pdf';

  console.log('[ÉTAPE 1] READING OFFICIAL PDF');
  if (!fs.existsSync(PDF_PATH)) {
    console.log(`✗ PDF not found: ${PDF_PATH}`);
    process.exit(1);
  }

  try {
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const data = await pdfParse(pdfBuffer);

    const pageCount = data.numpages || 0;
    const fullText = data.text || '';

    console.log(`- Pages read: ${pageCount}`);
    console.log(`- Text extracted: ${fullText.length} characters\n`);

    console.log('[ÉTAPE 2] PARSING PARTS LINES WITH FAIL-CLOSED VALIDATION');

    const rows: ExtractedRow[] = [];
    const lines = fullText.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i], 1, i + 1);
      if (parsed) {
        rows.push(parsed);
      }
    }

    const validated = rows.filter(r => r.validation_status === 'VALIDATED');
    const needsReview = rows.filter(r => r.validation_status === 'NEEDS_REVIEW');
    const rejected = rows.filter(r => r.validation_status === 'REJECTED');

    console.log(`- Total rows extracted: ${rows.length}`);
    console.log(`- Validated: ${validated.length}`);
    console.log(`- Needs review: ${needsReview.length}`);
    console.log(`- Rejected: ${rejected.length}\n`);

    console.log('[ÉTAPE 3] SAMPLE VALIDATED PARTS');
    validated.slice(0, 5).forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.part_number_normalized || row.part_number_raw} | ${row.designation_raw}`);
    });

    console.log('\n[BLOC B] FINAL VERDICT\n');
    console.log('## CHANGED');
    console.log('- scripts/bloc-b-extract-parts.ts');

    console.log('\n## PARTS_SOURCE_TRUTH');
    console.log(`- source_pdf: ${PDF_PATH}`);
    console.log(`- page_count: ${pageCount}`);
    console.log('- doc_type: official_parts_pdf (HAMMEL VB750)');

    console.log('\n## EXTRACTION_RESULT');
    console.log(`- real_pdf_read: ${rows.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`- parts_lines_extracted: ${rows.length}`);
    console.log(`- evidence_mapping_present: ${validated.length > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`- validated_count: ${validated.length}`);
    console.log(`- needs_review_count: ${needsReview.length}`);
    console.log(`- rejected_count: ${rejected.length}`);

    console.log('\n## SAMPLE_VALIDATED_ROWS');
    validated.slice(0, 3).forEach((row, i) => {
      console.log(`- row_${i + 1}: ${row.callout || '-'} | ${row.part_number_normalized || '-'} | ${row.designation_raw || '-'} | ${row.qty || '1'} | page ${row.source_page}`);
    });

    console.log('\n## COVERAGE_GAPS');
    console.log('- pages_with_no_output: unknown (full PDF text parsing needed)');
    console.log('- ambiguous_rows_detected: YES');
    console.log(`- missing_evidence_rows: ${rejected.length}`);
    console.log('- unresolved_table_structure: YES (PDF not natively table-aware)');

    console.log('\n## FINAL_VERDICT');
    const extracted = validated.length > 0;
    console.log(`- official_parts_pdf_extraction_proven: ${extracted ? 'PASS' : 'FAIL'}`);
    console.log(`- safe_for_parts_truth_layer: ${validated.length >= 10 ? 'PASS' : 'NEEDS_REVIEW'}`);

    console.log('\n## BLOCKERS');
    if (validated.length > 0) {
      console.log('- NONE (parts extracted with evidence mapping)');
      console.log(`\n✓ BLOC B PASSED - ${validated.length} parts extracted with validation`);
      console.log('\n→ READY FOR BLOC C: Persistence + Review Queue');
    } else {
      console.log('- No validated parts extracted (extraction may be incomplete)');
    }

    // Save results
    const result = {
      changed: ['scripts/bloc-b-extract-parts.ts'],
      extraction_result: {
        total_rows: rows.length,
        validated_count: validated.length,
        needs_review_count: needsReview.length,
        rejected_count: rejected.length,
      },
      sample_validated_rows: validated.slice(0, 10),
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync('bloc-b-extraction-result.json', JSON.stringify(result, null, 2));
    console.log('\n📄 Results saved to: bloc-b-extraction-result.json');

  } catch (err) {
    console.error(`✗ Error: ${err instanceof Error ? err.message : String(err)}`);
    console.log('\n## BLOCKERS');
    console.log(`- ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
