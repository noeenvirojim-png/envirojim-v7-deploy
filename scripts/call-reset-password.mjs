/**
 * Call the production /api/admin/reset-password endpoint to set the password
 * for noe@envirojim.com via the server-side Supabase admin client.
 * 
 * This avoids local DNS issues since the request goes to Vercel (which can reach Supabase).
 */

const PROD_URL = 'https://envirojim-final-deployment.vercel.app';
// The secret is last 20 chars of SUPABASE_SERVICE_ROLE_KEY
const ADMIN_SECRET = 'mkrmgTs'; // last 7 chars — adjust based on actual key
const SERVICE_KEY_SUFFIX = '48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs'; // last 20 chars
const USER_ID = 'a8da30ab-d1eb-40f8-9a22-919c3fc1828f';
const NEW_PASSWORD = '@Enviro2018!';

async function resetViaServer() {
    console.log('=== RESET PASSWORD VIA PRODUCTION SERVER ===');
    
    const secret = SERVICE_KEY_SUFFIX.slice(-20); // Last 20 chars of service role key
    
    const res = await fetch(`${PROD_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-secret': secret
        },
        body: JSON.stringify({ userId: USER_ID, newPassword: NEW_PASSWORD })
    });
    
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (res.status === 200) {
        console.log('\n✅ Password reset successful!');
        // Now test login
        const loginRes = await fetch(`${PROD_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'noe@envirojim.com', password: NEW_PASSWORD })
        });
        const loginData = await loginRes.json();
        console.log(`\nLogin test: HTTP ${loginRes.status}`);
        console.log(JSON.stringify(loginData, null, 2));
        if (loginRes.status === 200) {
            console.log('\n✅✅ LOGIN SUCCESS — noe@envirojim.com is now authenticated!');
        } else {
            console.log('\n❌ Login still fails — deeper investigation needed');
        }
    }
}

resetViaServer().catch(console.error);
