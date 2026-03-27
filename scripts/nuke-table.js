const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  for (const name of ['.env.local', '.env.production', '.env']) {
    const p = path.join(process.cwd(), name);
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

  console.log('[COMPLETE TABLE NUKE]\n');

  // Get fresh count
  const { data: before } = await supabase.from('parts_extraction_rows').select('id', { count: 'exact' });
  console.log(`Before: ${before?.length || 0} rows\n`);

  // Nuke via multiple deletes if needed
  let deleted = 0;
  let remaining = true;

  while (remaining) {
    const { data: batch } = await supabase
      .from('parts_extraction_rows')
      .select('id')
      .limit(500);

    if (!batch || batch.length === 0) {
      remaining = false;
      break;
    }

    const ids = batch.map(r => r.id);
    const { error } = await supabase.from('parts_extraction_rows').delete().in('id', ids);
    
    deleted += ids.length;
    console.log(`Deleted batch of ${ids.length} (total: ${deleted})`);

    if (error) {
      console.log(`Warning on batch delete: ${error.message}`);
    }
  }

  // Final check
  const { data: after } = await supabase.from('parts_extraction_rows').select('id', { count: 'exact' });
  console.log(`\nAfter: ${after?.length || 0} rows`);
  console.log(`Total deleted: ${deleted}\n`);

  // Also nuke audit runs
  let runDeleted = 0;
  let runRemaining = true;
  while (runRemaining) {
    const { data: batch } = await supabase
      .from('parts_extraction_audit_runs')
      .select('id')
      .limit(500);

    if (!batch || batch.length === 0) {
      runRemaining = false;
      break;
    }

    const ids = batch.map(r => r.id);
    await supabase.from('parts_extraction_audit_runs').delete().in('id', ids);
    runDeleted += ids.length;
  }

  console.log(`Audit runs deleted: ${runDeleted}\n`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
