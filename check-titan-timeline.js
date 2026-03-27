const { createClient } = require('@supabase/supabase-js');

const TITAN_ID = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';
const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // Check when clusters were created
  const { data: clusters } = await sb
    .from('canonical_clusters')
    .select('canonical_name, cluster_type, created_at')
    .eq('machine_id', TITAN_ID);

  console.log('Titan clusters:');
  (clusters || []).forEach(c => {
    console.log(`  ${c.cluster_type}: "${c.canonical_name}" (${c.created_at})`);
  });

  // Check fusion runs
  const { data: runs } = await sb
    .from('canonical_fusion_runs')
    .select('created_at, canonical_cluster_count')
    .eq('machine_id', TITAN_ID)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('\nLatest fusion run:');
  if (runs && runs.length > 0) {
    console.log(`  Created: ${runs[0].created_at}`);
    console.log(`  Clusters: ${runs[0].canonical_cluster_count}`);
  }

  process.exit(0);
}

run().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
