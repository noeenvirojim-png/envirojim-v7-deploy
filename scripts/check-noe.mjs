import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptznkpeneqfqhackdeau.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkNoeRole() {
  const { data, error } = await supabase.from('users').select('*').eq('email', 'noe@envirojim.com').single();
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('User Noe:', data);
  }
}

checkNoeRole().catch(console.error);
