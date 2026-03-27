const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TITAN_ID = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';
const mapping = {
  'Hydraulic Seal': 'part',
  'Pressure Valve': 'part',
  'Quarterly Inspection': 'maintenance_target',
  'Low Discharge Pressure. Symptoms include reduced flow rate and erratic gauge readings.': 'fault_target'
};

async function fix() {
  console.log('=== FIXING TITAN 500 CLUSTERS ===\n');

  // Get all clusters
  const { data: clusters } = await sb
    .from('canonical_clusters')
    .select('id, canonical_name')
    .eq('machine_id', TITAN_ID);

  console.log(`Found ${clusters?.length || 0} clusters\n`);

  // Update each
  for (const cluster of clusters || []) {
    const correctType = mapping[cluster.canonical_name] || 'component';
    
    const { error } = await sb
      .from('canonical_clusters')
      .update({ cluster_type: correctType })
      .eq('id', cluster.id);

    if (error) {
      console.error(`Error updating ${cluster.canonical_name}: ${error.message}`);
    } else {
      console.log(`✓ "${cluster.canonical_name}" -> ${correctType}`);
    }
  }

  // Verify
  console.log('\nVerifying...');
  const { data: updated } = await sb
    .from('canonical_clusters')
    .select('cluster_type')
    .eq('machine_id', TITAN_ID);

  const typeCounts = {};
  (updated || []).forEach(c => {
    typeCounts[c.cluster_type] = (typeCounts[c.cluster_type] || 0) + 1;
  });

  console.log('\nFinal distribution:');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  process.exit(0);
}

fix().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
