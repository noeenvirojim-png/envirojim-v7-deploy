const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Config
const CONCURRENT_USERS = 50;
const TEST_DURATION_SEC = 30; // Sustained load
const RAMP_UP_SEC = 5;

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Extract Project Ref for Cookie Name
// URL: https://<ref>.supabase.co
const projectRef = SUPABASE_URL.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
const COOKIE_NAME = `sb-${projectRef}-auth-token`;

async function getSession() {
    // Identify a valid user or create one.
    // We use a known test credential or technician.
    const email = 'technician@envirojim.com'; // Requires this user to exist
    const password = 'password123'; // Assumption

    // Actually, let's create a temp user via ADMIN first to be sure
    // But we need SERVICE_KEY for that.
    // Let's rely on the previous ATTACKER setup or similar?
    // Better: use the SERVICE_KEY to create a temp user for load testing.
    return null; // Implemented inside run
}

async function runTest() {
    console.log(`🚀 Starting API Load Test: ${CONCURRENT_USERS} concurrent users...`);
    console.log(`Target: ${APP_URL}`);

    // 1. Setup User
    const ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminClient = createClient(SUPABASE_URL, ADMIN_KEY);

    const email = `loadtest-${Date.now()}@test.com`;
    const password = 'LoadTestPass123!';

    console.log('Creating Load Test User...');
    const { data: user, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Load Tester', organization_id: '00000000-0000-0000-0000-000000000001', org_id: '00000000-0000-0000-0000-000000000001' },
        app_metadata: { role: 'TECHNICIAN', organization_id: '00000000-0000-0000-0000-000000000001', org_id: '00000000-0000-0000-0000-000000000001' }
    });

    if (createError) {
        console.error('Failed to create user:', createError);
        process.exit(1);
    }

    // 2. Login to get Session (Client Side Simulation)
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.error('Login Failed:', loginError);
        process.exit(1);
    }

    console.log('Login User Metadata:', loginData.user.user_metadata);
    console.log('Login App Metadata:', loginData.user.app_metadata);

    const { access_token, refresh_token } = loginData.session;

    // Cookie encoding: "base64-" + Base64(JSON.stringify(session))
    const sessionStr = JSON.stringify(loginData.session);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    const cookieValue = `base64-${base64Session}`;

    const headers = {
        'Cookie': `${COOKIE_NAME}=${cookieValue}`
    };

    console.log('Session acquired. Starting bombardment...');

    // 3. Bombard
    let success = 0;
    let fail = 0;
    const times = [];

    const request = async (id) => {
        const start = Date.now();
        try {
            const res = await fetch(`${APP_URL}/dashboard`, {
                headers,
                redirect: 'manual' // Don't follow redirects automatically to check for 307/302
            });

            const duration = Date.now() - start;
            times.push(duration);

            if (res.status === 200) {
                // Success
                // Check if body contains "Command Center" to be sure
                const text = await res.text();
                if (text.includes('Command Center')) {
                    // console.log(`[VU ${id}] OK (${duration}ms)`);
                    success++;
                } else {
                    console.log(`[VU ${id}] FAIL: 200 but missing content`);
                    fail++;
                }
            } else {
                const text = await res.text();
                console.log(`[VU ${id}] Error ${res.status}: ${text.substring(0, 200)}`);
                fail++;
            }

        } catch (e) {
            console.error(`[VU ${id}] Network Error:`, e.message);
            fail++;
        }
    };

    const tasks = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        tasks.push(request(i));
    }

    await Promise.all(tasks);

    // 4. Report
    console.log('\n--- LOAD TEST RESULTS ---');
    console.log(`Concurrent Users: ${CONCURRENT_USERS}`);
    console.log(`Success: ${success}`);
    console.log(`Failed: ${fail}`);

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Avg Latency: ${avg.toFixed(2)}ms`); // Only counting successful requests? No, all.

    // Cleanup
    await adminClient.auth.admin.deleteUser(user.user.id);

    if (fail > 0) {
        console.error('❌ Load Test FAILED with errors.');
        process.exit(1);
    } else {
        console.log('✅ Load Test PASSED.');
    }
}

runTest();
