/**
 * DIAGNOSTIC: Checks if the admin user exists in Supabase auth.users
 * and outputs their auth state - to find if the login error is from
 * a wrong password, unconfirmed email, or something else.
 */
const SUPABASE_URL = 'https://ptznkpenefqhackdeau.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODE4OTYsImV4cCI6MjA4Njc1Nzg5Nn0.QY5o3n7o49KUqI3IINWwUKhc3gGQ6KpLriLn4FB3Gws';
const TARGET_EMAIL = 'noe@envirojim.com';

async function run() {
    console.log('=== SUPABASE USER STATE DIAGNOSTIC ===\n');

    // --- Check 1: Look up user via Admin API
    console.log('1. Fetching auth.users via Admin API...');
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(TARGET_EMAIL)}`, {
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await res.json();
        console.log('   HTTP Status:', res.status);
        if (data.users?.length > 0) {
            const u = data.users[0];
            console.log('   ✅ User found in auth.users:');
            console.log('      ID:', u.id);
            console.log('      Email:', u.email);
            console.log('      Confirmed:', u.email_confirmed_at ? '✅ Yes (' + u.email_confirmed_at + ')' : '❌ NOT CONFIRMED');
            console.log('      Last sign in:', u.last_sign_in_at || 'Never');
            console.log('      Created at:', u.created_at);
            console.log('      App metadata role:', u.app_metadata?.role || '⚠️ MISSING');
        } else {
            console.log('   ❌ User NOT found! Raw:', JSON.stringify(data, null, 2));
        }
    } catch(e) {
        console.error('   Admin API Error:', e.message);
    }

    // --- Check 2: Try the /api/auth/login endpoint on production
    console.log('\n2. Testing production /api/auth/login...');
    try {
        const res = await fetch('https://envirojim-final-deployment.vercel.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TARGET_EMAIL, password: '@Enviro2018!' })
        });
        const data = await res.json();
        console.log('   HTTP Status:', res.status);
        console.log('   Response:', JSON.stringify(data));
    } catch(e) {
        console.error('   Endpoint Error:', e.message);
    }
}

run();
