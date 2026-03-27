import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('
')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [k, ...rest] = line.split('=');
      const v = rest.join('=').trim().replace(/^"|"$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

async function main() {
  console.log('[DIAGNOSTIC] DATABASE STATE INVESTIGATION');
  console.log('==========================================
');

  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log('✗ ENV INCOMPLETE');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: allRows, error } = await supabase
    .from('parts_extraction_rows')
    .select('id,validation_status', { count: 'exact' });

  if (error) {
    console.log('✗ Query failed: ' + error.message);
    process.exit(1);
  }

  const total = allRows?.length || 0;
  console.log('✓ parts_extraction_rows: ' + total + ' rows');

  const statusCounts = {};
  for (const row of allRows || []) {
    const status = row.validation_status || 'NULL';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  console.log('
Breakdown:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log('  - ' + status + ': ' + count);
  }

  const needsReviewCount = statusCounts['NEEDS_REVIEW'] || 0;
  console.log('
BLOC M Readiness: ' + (needsReviewCount > 0 ? 'CAN EXECUTE' : 'BLOCKED - 0 NEEDS_REVIEW'));
}

main().catch(err => console.error(err.message));
