const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    'http://127.0.0.1:55321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0'
  );

  try {
    console.log('Step 1: Check all machines in DB\n');
    const { data: allMachines } = await supabase.from('machines').select('id, model, brand, serial_number');
    console.log(`Total machines: ${allMachines?.length || 0}`);
    if (allMachines && allMachines.length > 0) {
      allMachines.slice(0, 3).forEach(m => {
        console.log(`  - ${m.model} (${m.serial_number})`);
      });
    }
    console.log();

    console.log('Step 2: Check parts in DB\n');
    const { data: allParts, count } = await supabase
      .from('parts')
      .select('*', { count: 'exact' })
      .limit(1);
    console.log(`Total parts: ${count}`);
    if (allParts && allParts.length > 0) {
      const p = allParts[0];
      console.log(`  Sample: ${p.canonical_part_number} (machine_id: ${p.machine_id})`);
    }
    console.log();

    if (allMachines && allMachines.length > 0) {
      console.log(`✓ Use first machine: ${allMachines[0].id}`);
    } else {
      console.log('✗ No machines available - would need to insert');
    }

  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
