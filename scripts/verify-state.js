const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const ROOT = process.cwd();
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
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

  const { data: rows, error } = await supabase
    .from('parts_extraction_rows')
    .select('id,validation_status,designation_raw', { count: 'exact' });

  console.log(`\nTotal rows: ${rows?.length || 0}`);
  console.log(`Counts by status:`);
  
  const counts = {};
  for (const row of (rows || [])) {
    counts[row.validation_status] = (counts[row.validation_status] || 0) + 1;
  }
  for (const [status, count] of Object.entries(counts)) {
    console.log(`  ${status}: ${count}`);
  }

  const nullDesig = rows?.filter(r => !r.designation_raw || r.designation_raw === 'null').length || 0;
  console.log(`\nWith null designation: ${nullDesig}`);
  console.log(`With real designation: ${(rows?.length || 0) - nullDesig}\n`);

  // Show sample of first 5 
  console.log('Sample rows:');
  for (const r of (rows || []).slice(0, 5)) {
    const desig = r.designation_raw || '(null)';
    console.log(`  [${r.validation_status}] ${desig.substring(0, 40)}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
