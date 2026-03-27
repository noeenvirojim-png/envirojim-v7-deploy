const { createClient } = require('@supabase/supabase-js');
const { fuseEntities } = require('./src/lib/machines/intelligence/fusion/EntityFusionService');

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TITAN_ID = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';

async function run() {
  console.log('=== TITAN 500 REFUSION ===\n');

  // Clean
  console.log('1) Cleaning...');
  await Promise.all([
    sb.from('canonical_cluster_members').delete().eq('machine_id', TITAN_ID),
    sb.from('canonical_cluster_aliases').delete().eq('machine_id', TITAN_ID),
    sb.from('canonical_cluster_links').delete().eq('machine_id', TITAN_ID),
    sb.from('canonical_clusters').delete().eq('machine_id', TITAN_ID),
  ]);
  console.log('✓\n');

  // Get machine org
  console.log('2) Getting org...');
  const { data: machine } = await sb
    .from('machines')
    .select('organization_id')
    .eq('id', TITAN_ID)
    .single();
  const orgId = machine?.organization_id || '00000000-0000-0000-0000-000000000000';
  console.log(`✓ Org: ${orgId}\n`);

  // Load entities
  console.log('3) Loading entities...');
  const { data: entities } = await sb
    .from('machine_kb_entities')
    .select('*')
    .eq('machine_id', TITAN_ID);

  if (!entities || entities.length === 0) throw new Error('No entities');
  console.log(`✓ ${entities.length} entities\n`);

  // Fuse
  console.log('4) Fusing...');
  const clusters = fuseEntities(entities);
  console.log(`✓ ${clusters.length} clusters\n`);
  
  // Show distribution
  const typeCounts = {};
  clusters.forEach(c => {
    typeCounts[c.cluster_type] = (typeCounts[c.cluster_type] || 0) + 1;
  });
  console.log('Cluster types:');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();

  // Write clusters directly
  console.log('5) Writing clusters...');
  const clusterRows = clusters.map(c => ({
    machine_id: TITAN_ID,
    canonical_name: c.canonical_name,
    cluster_type: c.cluster_type,
    confidence: c.confidence,
    source_entity_count: c.source_entity_ids.length,
    source_doc_count: c.source_docs.length,
  }));

  const { data: inserted, error } = await sb
    .from('canonical_clusters')
    .insert(clusterRows)
    .select('id');

  if (error) throw new Error(`Write failed: ${error.message}`);
  console.log(`✓ Wrote ${inserted?.length || 0} clusters\n`);

  console.log('✅ DONE');
  process.exit(0);
}

run().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
