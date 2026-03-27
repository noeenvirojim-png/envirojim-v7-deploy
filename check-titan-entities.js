const { createClient } = require('@supabase/supabase-js');

const TITAN_ID = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';
const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const { data: entities } = await sb
    .from('machine_kb_entities')
    .select('id, entity_type, canonical_name')
    .eq('machine_id', TITAN_ID);

  console.log('Titan 500 Source Entities (from DB):');
  (entities || []).forEach(e => {
    console.log(`  ${e.entity_type}: "${e.canonical_name}"`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
