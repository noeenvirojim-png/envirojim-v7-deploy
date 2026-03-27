const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

const MACHINE_ID = '30000000-0000-0000-0000-111111111111';

function normalizeEntityName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const { data: allClusters } = await supabase.from('canonical_clusters').select('id, canonical_name, cluster_type').eq('machine_id', MACHINE_ID);
  
  console.log('Looking for clusters matching "oil filter"...\n');
  
  const searchTerm = 'oil filter';
  const normSearch = normalizeEntityName(searchTerm);
  
  const clusterIds = allClusters.map(c => c.id);
  const { data: allAliases = [] } = await supabase.from('canonical_cluster_aliases').select('cluster_id, alias').in('cluster_id', clusterIds);
  
  for (const cluster of allClusters) {
    const normName = normalizeEntityName(cluster.canonical_name);
    const aliases = allAliases.filter(a => a.cluster_id === cluster.id).map(a => a.alias);
    
    if (normName.includes('oil') || normName.includes('filter') || normName.includes('hydraulic')) {
      console.log(`${cluster.canonical_name}`);
      console.log(`  Type: ${cluster.cluster_type}`);
      console.log(`  Norm: "${normName}"`);
      if (aliases.length > 0) {
        console.log(`  Aliases: ${aliases.join(', ')}`);
      }
      console.log('');
    }
  }
})();
