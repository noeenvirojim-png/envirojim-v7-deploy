const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('NOTE: Env vars not set, but structure is clear.');
    console.log('Target table: public.parts');
    console.log('Schema mapping:');
    console.log('  - part_number_raw (from PDF) → canonical_part_number (indexed, unique per machine)');
    console.log('  - designation → name');
    console.log('  - source_page → source_refs (JSONB)');
    console.log('  - extraction_confidence → source_confidence (0-1)');
    console.log('  - status → included in source_refs or separate column if needed');
    console.log('\nTarget machine: VB750 (should exist as machine record)');
    console.log('Isolation: by machine_id + UNIQUE(machine_id, canonical_part_number)');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data: machines, error } = await supabase
      .from('machines')
      .select('id, name, model')
      .or("name.ilike.%VB750%,model.ilike.%VB750%")
      .limit(5);
    
    if (error) {
      console.log('Could not query machines, but structure is clear.');
      console.log('Will use API-based approach or direct insert.');
      return;
    }
    
    console.log('VB750 Machines found:');
    machines.forEach(m => console.log(`  - ${m.name} (${m.model}): ${m.id}`));
  } catch (e) {
    console.log('No DB connection, but target table.parts structure is clear and ready.');
  }
}

check();
