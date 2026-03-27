const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
  loadEnv();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: needsReview } = await supabase
    .from('parts_extraction_rows')
    .select('id,part_number_raw,designation_raw,evidence_snippet,validation_status')
    .eq('validation_status', 'NEEDS_REVIEW')
    .limit(30);

  console.log('\n=== SAMPLE NEEDS_REVIEW ROWS (first 30) ===\n');
  for (const row of (needsReview || [])) {
    console.log(`ID: ${row.id}`);
    console.log(`  Part#: "${row.part_number_raw}"`);
    console.log(`  Desig: "${row.designation_raw}"`);
    console.log(`  Snippet: "${row.evidence_snippet}"`);
    console.log(`  Status: ${row.validation_status}`);
    console.log();
  }

  const { data: stats } = await supabase
    .from('parts_extraction_rows')
    .select('validation_status', { count: 'exact' });

  const counts = {};
  for (const row of (stats || [])) {
    counts[row.validation_status] = (counts[row.validation_status] || 0) + 1;
  }
  
  console.log('\n=== STATUS DISTRIBUTION ===');
  for (const [status, count] of Object.entries(counts)) {
    console.log(`${status}: ${count}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`✗ Error: ${err.message}`);
  process.exit(1);
});
