const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const titanId = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';

  console.log('=== CHECKING CANONICAL DATA FOR TITAN 500 ===\n');

  // 1. Clusters
  const { data: clusters, error: e1 } = await supabase
    .from('canonical_clusters')
    .select('id, canonical_name, cluster_type')
    .eq('machine_id', titanId);
  console.log(`Clusters: ${clusters?.length || 0}`);
  (clusters || []).forEach(c => {
    console.log(`  - ${c.canonical_name} (${c.cluster_type})`);
  });

  if (!clusters || clusters.length === 0) {
    console.log('\n❌ NO CLUSTERS FOUND - endpoint will fail');
    return;
  }

  const clusterIds = clusters.map(c => c.id);

  // 2. Aliases
  const { data: aliases } = await supabase
    .from('canonical_cluster_aliases')
    .select('cluster_id, alias')
    .in('cluster_id', clusterIds);
  console.log(`\nAliases: ${aliases?.length || 0}`);

  // 3. Members
  const { data: members } = await supabase
    .from('canonical_cluster_members')
    .select('cluster_id, source_entity_type')
    .in('cluster_id', clusterIds);
  console.log(`Members: ${members?.length || 0}`);

  // 4. Links
  const { data: links } = await supabase
    .from('canonical_cluster_links')
    .select('*')
    .in('from_cluster_id', clusterIds);
  console.log(`Links: ${links?.length || 0}`);

  // 5. Test query logic
  console.log('\n=== SIMULATING QUERY "pressure" ===');
  const searchTerm = 'pressure';
  const normTerm = searchTerm.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  
  const matches = clusters.filter(c => 
    c.canonical_name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim() === normTerm ||
    c.canonical_name.toLowerCase().includes(normTerm)
  );

  console.log(`Matches: ${matches.length}`);
  matches.forEach(m => {
    console.log(`  ✓ ${m.canonical_name} (${m.cluster_type})`);
  });

  if (matches.length === 0) {
    console.log(`❌ NO MATCHES - would return error response`);
  } else {
    console.log(`✓ Would return top_cluster: ${matches[0].canonical_name}`);
  }
})();
