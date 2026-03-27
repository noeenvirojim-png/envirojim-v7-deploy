const https = require('https');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('COLLE_TA_CLE')) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing or invalid');
    process.exit(1);
}

// Function to execute SQL via PostgREST if raw_sql RPC exists (common helper)
// Or inspect via specific endpoint if available.
// Since we don't have direct SQL access, we'll try to use the REST API 
// to see if we can trigger the error and get more details, or list functions.

// Strategy: We suspect a trigger named 'on_auth_user_created' or similar.
// We will try to call the likely sync function directly to see if it fails.

async function checkHealth() {
    console.log('🔍 Checking Supabase Health...');

    // 1. Check if public.users is accessible
    const url = new URL(`${SUPABASE_URL}/rest/v1/users?select=count`);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`Public Users Table Status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
                console.log(`Error body: ${body}`);
            } else {
                console.log('Public table seems accessible.');
            }
        });
    });
    req.end();
}

checkHealth();
