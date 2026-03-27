/**
 * Complete fix: 
 * 1. Wait for latest deployment to be READY
 * 2. Assign production alias to it
 * 3. Reset the user password via the newly-deployed reset endpoint
 * 4. Verify login works
 */
const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const PROD_ALIAS = 'envirojim-final-deployment.vercel.app';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';

const headers = { 
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json'
};

async function getLatestDeployment() {
    const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=1`, { headers });
    const data = await res.json();
    return data.deployments?.[0];
}

async function waitForReady(maxSecs = 180) {
    console.log('⏳ Waiting for latest deployment to be READY...');
    const start = Date.now();
    while ((Date.now() - start) < maxSecs * 1000) {
        const d = await getLatestDeployment();
        const elapsed = Math.round((Date.now() - start) / 1000);
        console.log(`  [${elapsed}s] ${d?.uid} | state=${d?.state} | readyState=${d?.readyState}`);
        if (d?.readyState === 'READY') return d;
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('Timeout waiting for deployment');
}

async function assignAlias(deploymentId) {
    console.log(`\n📌 Assigning ${PROD_ALIAS} → ${deploymentId}`);
    const res = await fetch(`https://api.vercel.com/v2/deployments/${deploymentId}/aliases?teamId=${TEAM_ID}`, {
        method: 'POST', headers,
        body: JSON.stringify({ alias: PROD_ALIAS })
    });
    const data = await res.json();
    console.log('Status:', res.status, JSON.stringify(data));
    return res.status === 200 || res.status === 201;
}

async function resetPassword(deployUrl) {
    console.log('\n🔑 Resetting password via server admin endpoint...');
    const secret = SERVICE_KEY.slice(-20);
    const res = await fetch(`${deployUrl}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ userId: 'a8da30ab-d1eb-40f8-9a22-919c3fc1828f', newPassword: '@Enviro2018!' })
    });
    const ct = res.headers.get('content-type') || '';
    console.log('Status:', res.status, '| Content-Type:', ct);
    if (ct.includes('json')) {
        const data = await res.json();
        console.log(JSON.stringify(data));
        return data.success;
    } else {
        console.log('HTML response (not JSON) —', res.status);
        return false;
    }
}

async function testLogin(url) {
    console.log('\n🔐 Testing login...');
    const res = await fetch(`${url}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
    });
    const data = await res.json();
    console.log(`HTTP ${res.status}:`, JSON.stringify(data));
    return res.status === 200 && data.success;
}

async function main() {
    console.log('=== COMPLETE FIX & VERIFY ===\n');

    const deploy = await waitForReady();
    const deployUrl = `https://${deploy.url}`;
    console.log('\n✅ Deployment READY:', deploy.uid, '|', deployUrl);

    // Try to assign alias (may require domain ownership)
    await assignAlias(deploy.uid);
    
    // Try on deployment URL directly first  
    console.log('\n--- Testing against deployment URL:', deployUrl);
    const resetOk = await resetPassword(deployUrl);
    
    if (resetOk) {
        await testLogin(deployUrl);
        // Also test main prod URL
        console.log('\n--- Testing against production alias:');
        await testLogin(`https://${PROD_ALIAS}`);
    } else {
        // Try main prod URL even if deployment endpoint failed
        console.log('\n--- Trying main prod URL directly:');
        await testLogin(`https://${PROD_ALIAS}`);
    }
}

main().catch(console.error);
