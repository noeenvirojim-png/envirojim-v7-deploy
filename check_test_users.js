const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking for test/demo users in Supabase auth...\n');
  
  // Get all users (service role has access)
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.log('Error fetching users:', error.message);
    console.log('\nNote: Test Supabase may not have user list access');
    console.log('Try creating test credentials manually');
  } else {
    console.log(`Total users found: ${users?.users?.length || 0}\n`);
    (users?.users || []).slice(0, 5).forEach(u => {
      console.log(`Email: ${u.email}`);
      console.log(`  Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'}`);
      console.log('');
    });
  }
})();
