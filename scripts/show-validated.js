const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const ROOT = process.cwd();
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

  const { data } = await supabase
    .from('parts_extraction_rows')
    .select('part_number_raw,designation_raw')
    .eq('validation_status', 'VALIDATED');

  console.log('VALIDATED PARTS:\n');
  for (const row of (data || [])) {
    console.log(`${row.part_number_raw} | ${row.designation_raw}`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
