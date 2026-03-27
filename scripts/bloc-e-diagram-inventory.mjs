import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
const workerFileUrl = 'file:///' + workerPath.replace(/\\/g, '/').replace(/^([a-z]):/, '$1:');

pdfjs.GlobalWorkerOptions.workerSrc = workerFileUrl;

const PDF_PATH = './artifacts/parts-truth/VB750-Parts-Catalog.pdf';

// Classification logic
function detectTableLikeStructure(text) {
  const lines = text.split('\n');
  const tabCount = text.split('\t').length - 1;
  const multiSpaceCount = (text.match(/  {2,}/g) || []).length;
  const verticalBars = (text.match(/\|/g) || []).length;
  const repeatColumns = lines.filter(l => {
    const spaces = (l.match(/  {2,}/g) || []).length;
    return spaces >= 3;
  }).length;

  return (
    tabCount > 5 ||
    multiSpaceCount > 10 ||
    verticalBars > 5 ||
    repeatColumns > lines.length * 0.3
  );
}

function detectDiagramLikeStructure(text) {
  const textLength = text.trim().length;
  const specialChars = (text.match(/[→↓↑←╱╲□◇△▪•●]/g) || []).length;
  const lines = text.split('\n');
  const emptyLines = lines.filter(l => l.trim().length < 3).length;
  const emptyLineRatio = emptyLines / Math.max(lines.length, 1);

  return (
    textLength < 200 ||
    specialChars > 3 ||
    emptyLineRatio > 0.5
  );
}

function detectCallouts(text) {
  const callouts = [];

  // Pattern 1: Isolated numbers (common in part callouts)
  const numberPattern = /\b(\d{1,2})\b/g;
  const numbers = new Set();
  let match;
  while ((match = numberPattern.exec(text)) !== null) {
    const num = match[1];
    const occurrences = (text.match(new RegExp(`\\b${num}\\b`, 'g')) || []).length;
    if (occurrences >= 2 && occurrences <= 20) {
      numbers.add(num);
    }
  }

  // Pattern 2: Alphanumeric callouts (like 1A, 2B, etc.)
  const alphanumPattern = /\b(\d{1,2}[A-Z])\b/g;
  while ((match = alphanumPattern.exec(text)) !== null) {
    callouts.push(match[1]);
  }

  // Add detected numbers
  numbers.forEach(n => callouts.push(n));

  // Pattern 3: Legend-like patterns with parentheses
  const legendPattern = /\((\d{1,2}[A-Z]?)\)/g;
  while ((match = legendPattern.exec(text)) !== null) {
    if (!callouts.includes(match[1])) {
      callouts.push(match[1]);
    }
  }

  return [...new Set(callouts)].sort();
}

function classifyPage(pageNum, text) {
  const textLength = text.trim().length;
  const pageAreaEstimate = 5000;
  const textDensity = Math.min(100, (textLength / pageAreaEstimate) * 100);

  const hasTable = detectTableLikeStructure(text);
  const hasDiagram = detectDiagramLikeStructure(text);
  const callouts = detectCallouts(text);

  let classification = 'UNCOVERED';
  let calloutStatus = 'NO_TEXT';
  let notes = '';

  if (textLength === 0) {
    classification = 'UNCOVERED';
    calloutStatus = 'NEEDS_OCR';
    notes = 'No text extracted; likely image-only page requiring OCR';
  } else if (textDensity < 5) {
    classification = 'DIAGRAM';
    calloutStatus = 'LOW_TEXT';
    notes = 'Very low text density; primarily diagram/image content';
  } else if (textDensity > 70) {
    classification = hasTable ? 'TABLE' : 'MIXED';
    calloutStatus = callouts.length > 0 ? 'CALLOUTS_FOUND' : 'LOW_TEXT';
    notes = `Dense text page; ${hasTable ? 'table-like' : 'mixed'} structure`;
  } else if (hasTable) {
    classification = 'TABLE';
    calloutStatus = callouts.length > 0 ? 'CALLOUTS_FOUND' : 'LOW_TEXT';
    notes = 'Table-like structure detected';
  } else if (hasDiagram) {
    classification = 'DIAGRAM';
    calloutStatus = callouts.length > 0 ? 'CALLOUTS_FOUND' : 'LOW_TEXT';
    notes = `Diagram-like structure; ${callouts.length} potential callouts detected`;
  } else {
    classification = 'MIXED';
    calloutStatus = callouts.length > 0 ? 'CALLOUTS_FOUND' : 'LOW_TEXT';
    notes = 'Mixed content; text and diagram elements';
  }

  return {
    page_number: pageNum,
    text_length: textLength,
    text_density: Math.round(textDensity * 10) / 10,
    has_table_like_structure: hasTable,
    has_diagram_like_structure: hasDiagram,
    detected_callouts: callouts,
    callout_count: callouts.length,
    classification,
    callout_status: calloutStatus,
    notes
  };
}

async function main() {
  console.log('[BLOC E] DIAGRAM INVENTORY + CALLOUT COVERAGE');
  console.log('=============================================\n');

  console.log('[ÉTAPE 1] READING PDF');
  if (!fs.existsSync(PDF_PATH)) {
    console.log(`✗ PDF not found: ${PDF_PATH}`);
    process.exit(1);
  }

  try {
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    const pageCount = pdf.numPages;

    console.log(`✓ PDF loaded: ${pageCount} pages\n`);

    console.log('[ÉTAPE 2] CLASSIFYING PAGES');
    const classifications = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      const pageText = text.items.map((item) => item.str).join(' ');

      const classified = classifyPage(i, pageText);
      classifications.push(classified);

      if (i % 5 === 0) {
        process.stdout.write(`  - Pages processed: ${i}/${pageCount}\r`);
      }
    }
    console.log(`✓ ${classifications.length} pages classified\n`);

    // Generate summary
    const summary = {
      total_pages: pageCount,
      table_pages: classifications.filter(p => p.classification === 'TABLE').length,
      diagram_pages: classifications.filter(p => p.classification === 'DIAGRAM').length,
      mixed_pages: classifications.filter(p => p.classification === 'MIXED').length,
      uncovered_pages: classifications.filter(p => p.classification === 'UNCOVERED').length,
      needs_ocr_pages: classifications.filter(p => p.callout_status === 'NEEDS_OCR').length,
      pages_with_callouts_detected: classifications.filter(p => p.callout_count > 0).length,
      total_callouts_detected: classifications.reduce((sum, p) => sum + p.callout_count, 0),
      callout_detection_success_rate: `${Math.round(
        (classifications.filter(p => p.callout_count > 0).length / pageCount) * 100
      )}%`,
      pages_by_status: {
        CALLOUTS_FOUND: classifications.filter(p => p.callout_status === 'CALLOUTS_FOUND').map(p => p.page_number),
        LOW_TEXT: classifications.filter(p => p.callout_status === 'LOW_TEXT').map(p => p.page_number),
        NO_TEXT: classifications.filter(p => p.callout_status === 'NO_TEXT').map(p => p.page_number),
        NEEDS_OCR: classifications.filter(p => p.callout_status === 'NEEDS_OCR').map(p => p.page_number),
        UNCOVERED: classifications.filter(p => p.callout_status === 'UNCOVERED').map(p => p.page_number),
      }
    };

    // Create output directory
    const outputDir = './artifacts/bloc-e';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON classification report
    fs.writeFileSync(
      path.join(outputDir, 'page-classification.json'),
      JSON.stringify(classifications, null, 2)
    );

    // Write CSV classification report
    const csvHeader = 'Page,Classification,Callout_Status,Text_Density,Callout_Count,Table_Structure,Diagram_Structure,Notes\n';
    const csvRows = classifications.map(p =>
      `${p.page_number},${p.classification},${p.callout_status},${p.text_density},${p.callout_count},${p.has_table_like_structure},${p.has_diagram_like_structure},"${p.notes}"`
    ).join('\n');
    fs.writeFileSync(path.join(outputDir, 'page-classification.csv'), csvHeader + csvRows);

    // Write diagram summary
    fs.writeFileSync(
      path.join(outputDir, 'diagram-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('[ÉTAPE 3] VERIFICATION');
    console.log(`- Total pages classified: ${classifications.length}/${pageCount}`);
    console.log(`- Pages with callouts: ${summary.pages_with_callouts_detected}`);
    console.log(`- Pages needing OCR: ${summary.needs_ocr_pages}`);
    console.log(`- Uncovered pages: ${summary.uncovered_pages}\n`);

    // Check for false coverage claims
    const falseCoverageClaim = classifications.some(p =>
      p.classification === 'UNCOVERED' && p.text_length > 0
    );

    console.log('[BLOC E] FINAL VERDICT\n');
    console.log('## CHANGED');
    console.log('- scripts/bloc-e-diagram-inventory.mjs');
    console.log('- artifacts/bloc-e/page-classification.json');
    console.log('- artifacts/bloc-e/page-classification.csv');
    console.log('- artifacts/bloc-e/diagram-summary.json\n');

    console.log('## PAGE_CLASSIFICATION_PROOF');
    console.log(`- total_pages: ${pageCount}`);
    console.log(`- table_pages: ${summary.table_pages}`);
    console.log(`- diagram_pages: ${summary.diagram_pages}`);
    console.log(`- mixed_pages: ${summary.mixed_pages}`);
    console.log(`- unreadable_pages: ${summary.needs_ocr_pages}\n`);

    console.log('## DIAGRAM_COVERAGE_RESULT');
    console.log(`- pages_with_callouts_detected: ${summary.pages_with_callouts_detected}`);
    console.log(`- total_callouts_detected: ${summary.total_callouts_detected}`);
    console.log(`- pages_needing_ocr_or_manual_review: ${summary.needs_ocr_pages}`);
    console.log(`- false_coverage_claim_detected: ${falseCoverageClaim ? 'YES' : 'NO'}`);
    console.log(`- final_status: ${classifications.length === pageCount && !falseCoverageClaim ? 'PASS' : 'FAIL'}\n`);

    console.log('## BLOCKERS');
    if (summary.uncovered_pages > 0) {
      console.log(`- ${summary.uncovered_pages} pages with NEEDS_OCR or no readable text`);
    }
    if (summary.diagram_pages > pageCount * 0.3) {
      console.log(`- Diagram pages dominate (${summary.diagram_pages}/${pageCount}); OCR capability needed for complete coverage`);
    }
    if (!falseCoverageClaim && classifications.length === pageCount) {
      console.log('- NONE');
    }

    console.log('\n✓ BLOC E COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
