const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing connection to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    console.log('Attempting to list users...');
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('❌ Error:', error.message);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Success! Found users:', data.users.length);
    }
}

test();
