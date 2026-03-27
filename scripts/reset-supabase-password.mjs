/**
 * Use the Supabase Admin API (via our production /api/admin route) 
 * to check auth.users and update the password for noe@envirojim.com.
 * 
 * Since we can't reach Supabase directly, we call our own admin API.
 */

const PROD_URL = 'https://envirojim-final-deployment.vercel.app';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';
const SUPABASE_URL = 'https://ptznkpenefqhackdeau.supabase.co';

async function resetPassword(userId, newPassword) {
    console.log(`Resetting password for user ID: ${userId}...`);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    if (res.status === 200) {
        console.log('✅ Password reset SUCCESS for:', data.email);
    } else {
        console.log('❌ Reset FAILED:', JSON.stringify(data));
    }
    return res.status === 200;
}

async function testLogin(password) {
    console.log(`\nTesting login with new password...`);
    const res = await fetch(`${PROD_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'noe@envirojim.com', password })
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response:', JSON.stringify(data));
    return res.status === 200;
}

async function main() {
    // User ID from our previous successful login
    const USER_ID = 'a8da30ab-d1eb-40f8-9a22-919c3fc1828f';
    const NEW_PASSWORD = '@Enviro2018!';
    
    console.log('=== SUPABASE PASSWORD RESET ===');
    console.log('Target user: noe@envirojim.com');
    console.log('User ID:', USER_ID);
    
    const resetOk = await resetPassword(USER_ID, NEW_PASSWORD);
    
    if (resetOk) {
        await testLogin(NEW_PASSWORD);
    }
}

main().catch(console.error);
