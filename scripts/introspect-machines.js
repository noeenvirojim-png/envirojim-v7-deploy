const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    'http://127.0.0.1:55321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0'
  );

  try {
    console.log('[PHASE 1] INTROSPECT MACHINES SCHEMA\n');

    // Query information_schema
    const { data, error } = await supabase.rpc('sql_execute', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'machines' AND table_schema = 'public'
        ORDER BY ordinal_position
      `
    }).catch(() => ({ data: null, error: 'RPC not available' }));

    if (!data || error) {
      console.log('RPC unavailable, using direct query approach...\n');
      
      // Try direct query on machines table
      const { data: sample } = await supabase.from('machines').select('*').limit(0);
      console.log('Table accessible, reading schema from PostgreSQL directly...\n');

      const { data: schema } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'machines')
        .eq('table_schema', 'public')
        .order('ordinal_position');

      if (schema) {
        console.log('Columns:');
        schema.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
      }
    } else {
      console.log('Schema from RPC:');
      data.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable ? 'nullable' : 'NOT NULL'} ${col.column_default || ''}`);
      });
    }

    // Alternative: try inserting with minimal fields and capture error
    console.log('\n[ATTEMPT MINIMAL INSERT]\n');
    const { data: test, error: testErr } = await supabase.from('machines').insert({
      organization_id: '11111111-1111-1111-1111-111111111111',
      serial_number: 'TEST-' + Date.now(),
    }).select('*');

    if (testErr) {
      console.log(`Error with minimal insert:\n  ${testErr.message}\n`);
      console.log('This tells us what fields are missing or invalid.\n');
    } else if (test) {
      console.log(`Success! Machine created: ${test[0]?.id}\n`);
      console.log('Minimal payload is sufficient.\n');
    }

  } catch (e) {
    console.error('Exception:', e.message);
  }
}

main();
