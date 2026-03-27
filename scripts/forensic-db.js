const https = require('https');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY || SERVICE_KEY.includes('COLLE_TA_CLE')) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing or invalid');
    process.exit(1);
}

// Helper for REST requests
function request(endpoint, method = 'GET') {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SUPABASE_URL}${endpoint}`);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function analyze() {
    console.log('🔍 STARTING FORENSIC ANALYSIS OF DATABASE...\n');

    // 1. Check public.users structure
    // We use ?limit=1 to just see the structure if data exists
    const usersCheck = await request('/rest/v1/users?select=*&limit=1');
    if (usersCheck.status === 200) {
        console.log('✅ public.users is accessible.');
        if (usersCheck.data.length > 0) {
            console.log('   Columns detected:', Object.keys(usersCheck.data[0]).join(', '));
        } else {
            console.log('   Table is empty (or RLS hidden).');
        }
    } else {
        console.error('❌ public.users access failed:', usersCheck);
    }

    // 2. Check for Foreign Keys / Dependencies via introspection (if exposed)
    // PostgREST exposes OpenAPI definition at root which describes relations
    const openApi = await request('/rest/v1/');
    if (openApi.status === 200) {
        // This is usually just the swagger UI HTML or JSON depending on Accept header
        // Let's try to infer from error messages on a protected operation
    }

    // 3. Test RPC capabilities (Is there a sync function exposed?)
    // We try to call a standard RPC. If it 404s, it doesn't exist.
    const rpcCheck = await request('/rest/v1/rpc/handle_new_user', 'POST');
    console.log(`\nPARAMS CHECK: handle_new_user RPC status: ${rpcCheck.status} (404 = function not exposed/missing)`);

    // 4. Try to fetch a user we KNOW exists in public but maybe not in Auth
    // "noe@envirojim.com" -> get ID
    const noeCheck = await request('/rest/v1/users?email=eq.noe@envirojim.com&select=id');
    if (noeCheck.data && noeCheck.data.length > 0) {
        console.log(`\nFound 'noe@envirojim.com' in public.users with ID: ${noeCheck.data[0].id}`);
        console.log('   -> This confirms the user is seeded in App DB.');
    } else {
        console.log("\n❌ 'noe@envirojim.com' NOT found in public.users.");
    }

    console.log('\n--- Analysis Complete ---');
}

analyze();
