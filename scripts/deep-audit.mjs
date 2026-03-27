import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptznkpeneqfqhackdeau.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function deepAudit() {
  console.log('--- DEEP TABLE AUDIT ---');

  const tables = ['organizations', 'users', 'machines'];
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
    if (error) {
      console.log(`- Table "${table}": ERROR (${error.message})`);
    } else {
      console.log(`- Table "${table}": FOUND (${count} rows)`);
      if (data && data.length > 0) {
        console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
      }
    }
  }
}

deepAudit().catch(console.error);
