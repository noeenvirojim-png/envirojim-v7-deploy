import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'machine_ingestion_steps' });
  
  if (error) {
    // If rpc fails, try a direct query to information_schema
    const { data: cols, error: colErr } = await supabase.from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'machine_ingestion_steps')
      .eq('table_schema', 'public');
    
    if (colErr) {
      console.error("Schema check failed:", colErr);
    } else {
      console.log("Columns:", cols.map(c => c.column_name));
    }
  } else {
    console.log("Columns (RPC):", data);
  }
}

run();
