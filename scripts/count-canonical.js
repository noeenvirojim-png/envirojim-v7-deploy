const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function count() {
  // Query with no limit to see all clusters
  const { data: clusters, error: e1, count: c1 } = await supabase
    .from('canonical_clusters')
    .select('id, machine_id, canonical_name', { count: 'exact' });
  
  console.log('Canonical clusters:');
  console.log('  Error:', e1 ? e1.message : 'none');
  console.log('  Count (via param):', c1);
  console.log('  Returned rows:', clusters ? clusters.length : 'none');
  if (clusters && clusters.length > 0) {
    console.log('  Sample:', JSON.stringify(clusters[0], null, 2));
    console.log('  First 5 machine_ids:', clusters.slice(0, 5).map(c => c.machine_id).join(', '));
  }

  // Also query aliases
  const { data: aliases, error: e2, count: c2 } = await supabase
    .from('canonical_cluster_aliases')
    .select('*', { count: 'exact' });

  console.log('\nCanonical aliases:');
  console.log('  Count:', c2);
  console.log('  Rows returned:', aliases ? aliases.length : '0');

  // Query members
  const { data: members, error: e3, count: c3 } = await supabase
    .from('canonical_cluster_members')
    .select('*', { count: 'exact' });

  console.log('\nCanonical members:');
  console.log('  Count:', c3);
  console.log('  Rows returned:', members ? members.length : '0');

  // Query links
  const { data: links, error: e4, count: c4 } = await supabase
    .from('canonical_cluster_links')
    .select('*', { count: 'exact' });

  console.log('\nCanonical links:');
  console.log('  Count:', c4);
  console.log('  Rows returned:', links ? links.length : '0');
}

count().catch(err => console.error('Error:', err));
