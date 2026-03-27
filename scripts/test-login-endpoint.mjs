// Test the production /api/auth/login endpoint directly
const PROD_URL = 'https://envirojim-final-deployment.vercel.app';

async function testLoginEndpoint() {
    console.log('Testing /api/auth/login endpoint...');
    const res = await fetch(`${PROD_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    if (res.status === 200 && data.success) {
        console.log('✅ LOGIN SUCCESS — User:', data.user?.email);
    } else {
        console.log('❌ LOGIN FAILED — Error:', data.error);
        console.log('\n📋 ROOT CAUSE DIAGNOSIS:');
        if (data.error === 'Courriel ou mot de passe invalide') {
            console.log('  Supabase rejected the credentials.');
            console.log('  Possible causes:');
            console.log('  1. NEXT_PUBLIC_SUPABASE_ANON_KEY is wrong in Vercel environment');
            console.log('  2. Password was changed in Supabase dashboard');
            console.log('  3. User email noe@envirojim.com does not exist in auth.users');
        }
    }
}

testLoginEndpoint().catch(e => console.error('Fatal:', e.message));
