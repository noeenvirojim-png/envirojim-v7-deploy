import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [k, ...rest] = line.split('=');
      const v = rest.join('=').trim().replace(/^"|"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

async function main() {
  console.log('[BLOC K] REVIEW UI SMOKE TEST');
  console.log('============================\n');

  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('[ÉTAPE 1] QUERYING PARTS EXTRACTION ROWS');

  const { data: rows, error } = await supabase
    .from('parts_extraction_rows')
    .select('id,machine_id,validation_status,parts_review_decisions(id,decision_status,is_active)')
    .limit(5);

  if (error) {
    console.log(`✗ Query failed: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Query successful\n`);

  console.log('[ÉTAPE 2] SAMPLE DATA');

  const sampleCount = rows?.length || 0;
  console.log(`- Sample rows returned: ${sampleCount}`);

  if (rows && rows.length > 0) {
    const firstRow = rows[0];
    console.log(`- First row status: ${firstRow.validation_status}`);
    const hasDecisions = (firstRow.parts_review_decisions || []).length > 0;
    console.log(`- First row has review decisions: ${hasDecisions ? 'YES' : 'NO'}`);
  }

  console.log('\n## RESULT');
  console.log(`- parts_extraction_rows queryable: PASS`);
  console.log(`- sample_rows_returned: ${sampleCount}`);
  console.log(`- final_status: ${error ? 'FAIL' : 'PASS'}`);

  console.log('\n✓ BLOC K SMOKE TEST COMPLETE');
}

main().catch(err => {
  console.error(`✗ Error: ${err.message}`);
  process.exit(1);
});
