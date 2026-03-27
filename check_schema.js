const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('=== CHECKING CLUSTER SCHEMA ===');
  
  // Get raw cluster data to see if there's a default value being applied
  const { data: clusters, error } = await supabase
    .from('canonical_clusters')
    .select('id, cluster_type, confidence, created_at')
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample clusters:');
    clusters.forEach(c => {
      console.log(`  id: ${c.id}`);
      console.log(`    cluster_type: ${c.cluster_type} (type: ${typeof c.cluster_type})`);
      console.log(`    created_at: ${c.created_at}`);
    });
  }

  // Check if there's a trigger or default that might be overwriting cluster_type
  console.log('\n=== CHECKING TITAN 500 CLUSTER MEMBERS ===');
  const titanId = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';
  
  const { data: members, error: mErr } = await supabase
    .from('canonical_cluster_members')
    .select('cluster_id, source_entity_type')
    .limit(5);
  
  if (mErr) {
    console.error('Error:', mErr);
  } else {
    console.log('Sample members:');
    members.forEach(m => {
      console.log(`  cluster_id: ${m.cluster_id}, source_entity_type: ${m.source_entity_type}`);
    });
  }
})();
