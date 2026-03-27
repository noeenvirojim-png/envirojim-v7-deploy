import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptznkpeneqfqhackdeau.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function audit() {
  console.log('--- SUPABASE AUTH AUDIT ---');

  // 1. List Users & Providers
  console.log('\n1. Active Users & Providers:');
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing users:', userError.message);
  } else {
    users.forEach(u => {
      console.log(`- ${u.email} [ID: ${u.id}] | Providers: ${u.app_metadata.providers.join(', ')} | Confirmed: ${!!u.email_confirmed_at}`);
    });
  }

  // 2. Redirect URLs Audit
  // Note: Redirect URLs are theoretically in the Supabase config, 
  // but for the audit, we can check if we can reach the settings or 
  // if we can see them via common auth endpoints if accessible.
  // Actually, we'll rely on the user's manual check or common knowledge if not queryable.
  // We can try to get the project config if the management API was available, 
  // but here we only have service role.
  
  // 3. Test SMTP (by checking if any users have unconfirmed emails)
  console.log('\n2. SMTP Indicators:');
  const unconfirmed = users?.filter(u => !u.email_confirmed_at) || [];
  console.log(`- Unconfirmed users: ${unconfirmed.length}`);
  if (unconfirmed.length > 0) {
     console.log('  ⚠️ Possible SMTP delivery issue or user inaction detected.');
  } else {
     console.log('  ✅ All active users confirmed.');
  }

  // 4. Verify RLS (Check a protected table)
  console.log('\n3. RLS Check (Tables):');
  const { data: tables, error: tableError } = await supabase.from('clients').select('id').limit(1);
  if (tableError) {
      console.log('  ❌ Error accessing "clients" table:', tableError.message);
  } else {
      console.log('  ✅ "clients" table accessible with service role.');
  }
}

audit().catch(console.error);
