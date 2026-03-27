const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data: machines } = await supabase
    .from('machines')
    .select('id, model')
    .limit(20);
  
  console.log('=== ALL MACHINES WITH ENTITY & CLUSTER STATUS ===');
  
  for (const machine of machines || []) {
    const { count: entCount } = await supabase
      .from('machine_kb_entities')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', machine.id);

    const { count: clCount } = await supabase
      .from('canonical_clusters')
      .select('*', { count: 'exact', head: true })
      .eq('machine_id', machine.id);

    if (entCount || clCount) {
      console.log(`\n${machine.model} (${machine.id})`);
      console.log(`  Entities: ${entCount || 0}`);
      console.log(`  Clusters: ${clCount || 0}`);
      
      // Get cluster type distribution
      if (clCount) {
        const { data: clusters } = await supabase
          .from('canonical_clusters')
          .select('cluster_type')
          .eq('machine_id', machine.id);
        
        const byType = {};
        (clusters || []).forEach(c => {
          byType[c.cluster_type] = (byType[c.cluster_type] || 0) + 1;
        });
        console.log(`  Cluster types: ${JSON.stringify(byType)}`);
      }
    }
  }
})();
