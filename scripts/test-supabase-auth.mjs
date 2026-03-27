// Quick Supabase auth direct test
const SUPABASE_URL = 'https://ptznkpenefqhackdeau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODE4OTYsImV4cCI6MjA4Njc1Nzg5Nn0.QY5o3n7o49KUqI3IINWwUKhc3gGQ6KpLriLn4FB3Gws';

async function run() {
    console.log('--- Testing Supabase Auth ---');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
    });
    const data = await res.json();
    console.log('HTTP Status:', res.status);
    if (data.access_token) {
        console.log('✅ AUTH SUCCESS');
        console.log('   User email:', data.user?.email);
        console.log('   User role:', data.user?.role);
        console.log('   Token (first 60 chars):', data.access_token.slice(0, 60) + '...');
        console.log('   Expires in:', data.expires_in, 's');
    } else {
        console.warn('⚠️ AUTH FAILED');
        console.log('   Response:', JSON.stringify(data, null, 2));
    }
}

run().catch(err => console.error('Error:', err.message));
