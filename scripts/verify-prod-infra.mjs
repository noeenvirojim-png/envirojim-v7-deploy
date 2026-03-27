/**
 * ENVIROJIM V8 — PRODUCTION INFRA VERIFICATION
 * Verifies prod URL accessibility + Supabase auth flow.
 */

const PROD_URL = 'https://envirojim-final-deployment.vercel.app';
const SUPABASE_URL = 'https://ptznkpenefqhackdeau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODE4OTYsImV4cCI6MjA4Njc1Nzg5Nn0.QY5o3n7o49KUqI3IINWwUKhc3gGQ6KpLriLn4FB3Gws';
const TEST_USER = {
  email: 'noe@envirojim.com',
  password: '@Enviro2018!'
};

async function checkProdURL() {
  try {
    const res = await fetch(`${PROD_URL}/login`, { method: 'GET' });
    console.log('✅ PROD /login Status:', res.status);
    const text = await res.text();
    console.log('   Snippet:', text.slice(0, 200));
    return res.status === 200;
  } catch (e) {
    console.error('❌ PROD URL not reachable:', e.message);
    return false;
  }
}

async function checkSupabaseAuth() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    const data = await res.json();
    if (res.status === 200 && data.access_token) {
      console.log('✅ Supabase login success:', data.user?.email || 'user exists');
      console.log('   Role:', data.user?.role);
      console.log('   Expires in:', data.expires_in, 's');
      return true;
    } else {
      console.warn('⚠️ Supabase login failed:', JSON.stringify(data));
      return false;
    }
  } catch (e) {
    console.error('❌ Supabase auth request failed:', e.message);
    return false;
  }
}

async function checkHealthEndpoint() {
  try {
    const res = await fetch(`${PROD_URL}/api/admin/health`);
    const data = await res.json();
    console.log('✅ Health endpoint:', res.status, '|', data.status);
    console.log('   AI Vector Schema:', data.checks?.ai_vector_schema);
    console.log('   RBAC Version:', data.security?.rbac_version);
    return res.status === 200;
  } catch (e) {
    console.error('❌ Health check failed:', e.message);
    return false;
  }
}

async function verifyProduction() {
  console.log('--- VERIFYING PROD ENVIRONMENT ---');
  const urlOk = await checkProdURL();
  const authOk = await checkSupabaseAuth();
  const healthOk = await checkHealthEndpoint();

  console.log('\n--- VERIFICATION COMPLETE ---');
  if (urlOk && authOk && healthOk) {
    console.log('🎯 PROD READY: Login works, page accessible, health OK.');
  } else {
    console.warn('🚨 PROD BLOCKED: Fix URL/Keys/Auth before running full audit.');
    console.log(`   URL:    ${urlOk ? '✅' : '❌'}`);
    console.log(`   Auth:   ${authOk ? '✅' : '❌'}`);
    console.log(`   Health: ${healthOk ? '✅' : '❌'}`);
  }
}

verifyProduction();
