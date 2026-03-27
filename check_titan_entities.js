const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const titanId = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';
  
  console.log('=== TITAN 500 SOURCE ENTITIES ===');
  const { data: entities, error: entErr } = await supabase
    .from('machine_kb_entities')
    .select('id, entity_type, canonical_name')
    .eq('machine_id', titanId);
  
  if (entErr) {
    console.error('Error fetching entities:', entErr.message);
  } else {
    console.log(`Total entities: ${entities?.length || 0}`);
    const byType = {};
    (entities || []).forEach(e => {
      byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
    });
    console.log('By type:', byType);
    console.log('\nSample entities:');
    (entities || []).slice(0, 10).forEach(e => {
      console.log(`  ${e.entity_type.padEnd(20)} ${e.canonical_name}`);
    });
  }

  console.log('\n=== TITAN 500 CANONICAL CLUSTERS ===');
  const { data: clusters, error: clErr } = await supabase
    .from('canonical_clusters')
    .select('id, cluster_type, canonical_name')
    .eq('machine_id', titanId);

  if (clErr) {
    console.error('Error fetching clusters:', clErr.message);
  } else {
    console.log(`Total clusters: ${clusters?.length || 0}`);
    const byType = {};
    (clusters || []).forEach(c => {
      byType[c.cluster_type] = (byType[c.cluster_type] || 0) + 1;
    });
    console.log('By type:', byType);
    console.log('\nCluster details:');
    (clusters || []).forEach(c => {
      console.log(`  ${c.cluster_type.padEnd(20)} ${c.canonical_name}`);
    });
  }
})();
