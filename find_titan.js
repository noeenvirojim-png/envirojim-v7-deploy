const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data: machines, error: err } = await supabase
    .from('machines')
    .select('*')
    .limit(5);
  
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Sample machine:', machines?.[0]);
  }
})();
