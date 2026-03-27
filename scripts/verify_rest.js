require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

console.log(`Checking Supabase REST API at ${supabaseUrl}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRest() {
    try {
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ REST API Error:', error.message);
            // If error is 404 or 500, project might be paused or broken.
            // But if we get a response, the service is reachable.
            console.log('Detailed error:', error);
        } else {
            console.log('✅ REST API is reachable.');
        }
    } catch (err) {
        console.error('❌ Network/Client Error:', err.message);
    }
}

checkRest();
