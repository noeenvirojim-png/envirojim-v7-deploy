import { createClient } from '@supabase/supabase-js';

// CORRECT URL from .env.local
const SUPABASE_URL = 'https://ptznkpenefqhackdeau.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRPC() {
    console.log(`Checking for exec_sql RPC on ${SUPABASE_URL}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    
    if (error) {
        console.log('exec_sql NOT found or failed:', error.message);
    } else {
        console.log('exec_sql FOUND! Result:', data);
    }
}

checkRPC().catch(console.error);
