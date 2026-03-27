const { createClient } = require('@supabase/supabase-js');

const MACHINE_ID = '30000000-0000-0000-0000-111111111111';

async function check() {
  const sb = createClient(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Total clusters
  const { count: total } = await sb
    .from('canonical_clusters')
    .select('*', { count: 'exact', head: true })
    .eq('machine_id', MACHINE_ID);

  // System clusters
  const { count: systemCount, data: systems } = await sb
    .from('canonical_clusters')
    .select('id, canonical_name, cluster_type')
    .eq('machine_id', MACHINE_ID)
    .eq('cluster_type', 'system')
    .order('canonical_name')
    .limit(10);

  // All cluster types
  const { data: allTypes } = await sb
    .from('canonical_clusters')
    .select('cluster_type')
    .eq('machine_id', MACHINE_ID);

  const typeCounts = {};
  (allTypes || []).forEach(c => {
    typeCounts[c.cluster_type] = (typeCounts[c.cluster_type] || 0) + 1;
  });

  console.log(`\n=== DB CHECK ===\n`);
  console.log(`Total clusters: ${total}`);
  console.log(`System clusters: ${systemCount || 0}`);
  console.log(`\nCluster type distribution:`, typeCounts);
  
  if (systems && systems.length > 0) {
    console.log(`\nFirst ${systems.length} systems:`);
    systems.forEach(s => console.log(`  - ${s.canonical_name}`));
  } else {
    console.log(`\nNo systems found.`);
    console.log(`\nAlternative cluster types available:`);
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (type !== 'system') console.log(`  ${type}: ${count}`);
    });
  }

  process.exit(0);
}

check().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
