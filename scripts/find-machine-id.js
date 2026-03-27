const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function find() {
  // Get distinct machine_ids from canonical_clusters
  const { data: clusters } = await supabase
    .from('canonical_clusters')
    .select('machine_id')
    .limit(1000);

  const machineIds = new Set();
  const idCounts = {};
  
  if (clusters) {
    clusters.forEach(c => {
      machineIds.add(c.machine_id);
      idCounts[c.machine_id] = (idCounts[c.machine_id] || 0) + 1;
    });
  }

  console.log('Machine IDs in canonical_clusters:');
  for (const [id, count] of Object.entries(idCounts)) {
    console.log(`  ${id}: ${count} clusters`);
  }

  // Also check the machine_kb table for the VB750
  const { data: machines } = await supabase
    .from('machine_kb')
    .select('id, machine_id, version')
    .or('machine_id.ilike.%VB750%,machine_id.ilike.%vb750%')
    .limit(10);

  console.log('\nMachines matching VB750:');
  if (machines && machines.length > 0) {
    machines.forEach(m => {
      console.log(`  id: ${m.id}, machine_id: ${m.machine_id}, version: ${m.version}`);
    });
  } else {
    console.log('  No VB750 machines found');
  }

  // Get all machines
  const { data: allMachines } = await supabase
    .from('machine_kb')
    .select('id, machine_id, version')
    .limit(20);

  console.log('\nAll machines (first 20):');
  if (allMachines) {
    allMachines.forEach(m => {
      console.log(`  id: ${m.id}, machine_id: ${m.machine_id}`);
    });
  }
}

find().catch(err => console.error('Error:', err));
