import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptznkpeneqfqhackdeau.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listTables() {
  console.log('--- SCHEMA AUDIT ---');

  // Querying the schema information
  const { data, error } = await supabase.rpc('get_tables'); // Custom RPC if it exists
  
  if (error) {
      console.log('RPC get_tables failed. Trying direct SQL-like query if possible...');
      // Fallback: Try a known table from the codebase
      const potentialTables = ['clients', 'machines', 'client_oauth_tokens', 'profiles', 'users'];
      for (const table of potentialTables) {
          const { error: tErr } = await supabase.from(table).select('id').limit(1);
          if (tErr) {
              console.log(`- Table "${table}": NOT FOUND (${tErr.message})`);
          } else {
              console.log(`- Table "${table}": FOUND`);
          }
      }
  } else {
      console.log('Tables found via RPC:', data);
  }
}

listTables().catch(console.error);
