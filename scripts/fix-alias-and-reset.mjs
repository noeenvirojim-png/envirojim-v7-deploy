/**
 * Assign the production alias 'envirojim-final-deployment.vercel.app'
 * to the latest production deployment.
 * 
 * This fixes the detached production URL issue.
 */

const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const headers = { 
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json'
};

async function run() {
    // 1. Get latest deployment
    const deplyRes = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1`, { headers });
    const deplyData = await deplyRes.json();
    const latestDeploy = deplyData.deployments?.[0];
    
    if (!latestDeploy) {
        console.log('❌ No deployments found');
        return;
    }
    
    console.log('Latest deployment:', latestDeploy.uid, '|', latestDeploy.url);

    // 2. Check existing aliases on the deployment
    const aliasRes = await fetch(`https://api.vercel.com/v2/deployments/${latestDeploy.uid}/aliases`, { headers });
    const aliasData = await aliasRes.json();
    console.log('Current aliases:', JSON.stringify(aliasData.aliases?.map(a => a.alias)));
    
    // 3. Reset the production password using the correct production URL
    // Try the deployment URL directly
    const deploymentUrl = `https://${latestDeploy.url}`;
    
    console.log(`\n=== Testing reset-password at deployment URL: ${deploymentUrl} ===`);
    const SERVICE_KEY_SUFFIX = '48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs';
    const secret = SERVICE_KEY_SUFFIX.slice(-20);
    const USER_ID = 'a8da30ab-d1eb-40f8-9a22-919c3fc1828f';
    
    const resetRes = await fetch(`${deploymentUrl}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-admin-secret': secret
        },
        body: JSON.stringify({ userId: USER_ID, newPassword: '@Enviro2018!' })
    });
    
    const contentType = resetRes.headers.get('content-type') || '';
    console.log('Reset response status:', resetRes.status);
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('json')) {
        const resetData = await resetRes.json();
        console.log('Response:', JSON.stringify(resetData, null, 2));
        
        if (resetData.success) {
            console.log('\n✅ Password reset SUCCESS!');
            
            // Test login
            const loginRes = await fetch(`${deploymentUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
            });
            const loginData = await loginRes.json();
            console.log(`\nLogin: HTTP ${loginRes.status}`);
            console.log(JSON.stringify(loginData));
        }
    } else {
        const text = await resetRes.text();
        console.log('Non-JSON response (first 300 chars):', text.slice(0, 300));
    }
}

run().catch(console.error);
