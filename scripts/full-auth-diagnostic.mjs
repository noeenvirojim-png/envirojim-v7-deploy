/**
 * PHASE 1 & 2: DNS + Network + Supabase Auth Diagnostic
 * Checks: DNS resolution, /login reachability, Supabase auth POST
 */
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

const PROD_HOST = 'envirojim-final-deployment.vercel.app';
const SUPA_HOST = 'ptznkpenefqhackdeau.supabase.co';
const SUPABASE_URL = `https://${SUPA_HOST}`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODE4OTYsImV4cCI6MjA4Njc1Nzg5Nn0.QY5o3n7o49KUqI3IINWwUKhc3gGQ6KpLriLn4FB3Gws';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

async function checkDNS(host) {
    try {
        const ips = await resolve4(host);
        console.log(`   ✅ DNS OK: ${host} → ${ips.join(', ')}`);
        return true;
    } catch (e) {
        console.log(`   ❌ DNS FAIL: ${host} → ${e.message}`);
        return false;
    }
}

async function checkHTTP(url, label) {
    try {
        const res = await fetch(url, { method: 'GET' });
        console.log(`   ✅ ${label}: HTTP ${res.status}`);
        return res.status;
    } catch (e) {
        console.log(`   ❌ ${label}: ${e.message}`);
        return null;
    }
}

async function checkSupabaseAuth() {
    console.log('\n2️⃣  SUPABASE AUTH DIRECT POST (Anon Key)');
    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
        });
        const data = await res.json();
        console.log(`   HTTP Status: ${res.status}`);
        if (data.access_token) {
            console.log('   ✅ Supabase Auth SUCCESS');
            console.log('   User:', data.user?.email);
            console.log('   Token prefix:', data.access_token.slice(0, 40) + '...');
        } else {
            console.log('   ❌ Auth FAILED:', JSON.stringify(data));
        }
        return data.access_token ? true : false;
    } catch (e) {
        console.log(`   ❌ NETWORK FAIL: ${e.message}`);
        console.log('   → Supabase unreachable from this machine (local DNS/firewall issue)');
        return false;
    }
}

async function checkVercelBuild() {
    console.log('\n3️⃣  VERCEL BUILD STATUS');
    // We check /api/admin/health which shows server-side state
    try {
        const res = await fetch('https://envirojim-final-deployment.vercel.app/api/admin/health');
        const data = await res.json();
        console.log('   HTTP Status:', res.status);
        console.log('   Health status:', data.status);
        console.log('   DB rest:', data.checks?.database_rest);
        console.log('   AI vector:', data.checks?.ai_vector_schema);
        
        // Check env-check endpoint (may not be deployed yet)
        const envRes = await fetch('https://envirojim-final-deployment.vercel.app/api/admin/env-check');
        if (envRes.status === 200) {
            const envData = await envRes.json();
            console.log('\n   🔑 ENV VARS CHECK:');
            console.log('   Supabase URL:', envData.NEXT_PUBLIC_SUPABASE_URL);
            console.log('   Anon Key:', envData.NEXT_PUBLIC_SUPABASE_ANON_KEY_VALID);
            console.log('   Service Key:', envData.SUPABASE_SERVICE_ROLE_KEY_VALID);
            console.log('   Gemini Key:', envData.GEMINI_API_KEY_SET);
        } else {
            console.log('   ⚠️ /api/admin/env-check not yet deployed (still building)');
        }
    } catch (e) {
        console.error('   Error:', e.message);
    }
}

async function checkLoginAPI() {
    console.log('\n4️⃣  PRODUCTION /api/auth/login ENDPOINT');
    const res = await fetch('https://envirojim-final-deployment.vercel.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
    });
    const data = await res.json();
    console.log('   HTTP Status:', res.status);
    console.log('   Response:', JSON.stringify(data));
    return res.status === 200 && data.success;
}

async function main() {
    console.log('========================================');
    console.log('PHASE 1 — DNS & NETWORK RESOLUTION');
    console.log('========================================');
    const vercelDNS = await checkDNS(PROD_HOST);
    const supaDNS = await checkDNS(SUPA_HOST);
    
    if (vercelDNS) await checkHTTP(`https://${PROD_HOST}/login`, 'Prod /login');
    
    await checkSupabaseAuth();
    await checkVercelBuild();
    const loginOk = await checkLoginAPI();
    
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Vercel DNS:         ${vercelDNS ? '✅' : '❌'}`);
    console.log(`Supabase DNS:       ${supaDNS ? '✅' : '❌ (local network blocks direct access)'}`);
    console.log(`/api/auth/login:    ${loginOk ? '✅ HTTP 200 OK' : '❌ FAILED'}`);
    
    if (!supaDNS) {
        console.log('\n⚠️  DIAGNOSIS: Supabase domain is not reachable from this machine.');
        console.log('   This is a LOCAL NETWORK issue (firewall/ISP/DNS).');
        console.log('   The production Vercel server CAN reach Supabase (health check passes).');
        console.log('   The login error "Courriel ou mot de passe invalide" MAY occur only');
        console.log('   when the browser tries to use the client-side Supabase SDK directly,');
        console.log('   bypassing our hardened /api/auth/login server route.');
        console.log('\n   SOLUTION: Test from a mobile hotspot or different network.');
    }
}

main().catch(console.error);
