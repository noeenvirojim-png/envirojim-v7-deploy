/**
 * Wait for Vercel deployment to finish, then confirm env-check passes.
 */
const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const DEPLOY_UID = 'dpl_DABoy1K1cWE9WGE3T5ze9TRkz3JV';
const headers = { 'Authorization': `Bearer ${VERCEL_TOKEN}` };

async function waitForDeploy(maxWaitSeconds = 600) {
    console.log(`⏳ Monitoring deployment ${DEPLOY_UID}...`);
    const start = Date.now();
    
    while ((Date.now() - start) < maxWaitSeconds * 1000) {
        const res = await fetch(`https://api.vercel.com/v13/deployments/${DEPLOY_UID}?teamId=${TEAM_ID}`, { headers });
        const d = await res.json();
        
        if (d.error) {
            console.log('Error fetching deployment:', d.error.message);
            break;
        }
        
        const elapsed = Math.round((Date.now() - start) / 1000);
        console.log(`   [${elapsed}s] Status: ${d.status} | Ready: ${d.readyState || d.status}`);
        
        if (d.status === 'READY') {
            console.log('✅ Deployment is READY!');
            console.log('   URL:', d.url);
            return d;
        }
        if (d.status === 'ERROR' || d.status === 'CANCELED') {
            console.log('❌ Deployment FAILED:', d.status);
            return null;
        }
        
        await new Promise(r => setTimeout(r, 10000)); // poll every 10s
    }
    console.log('⚠️  Timeout waiting for deployment');
    return null;
}

const ready = await waitForDeploy(180);
if (ready) {
    // Confirm env-check is live
    const res = await fetch('https://envirojim-final-deployment.vercel.app/api/admin/env-check');
    if (res.headers.get('content-type')?.includes('json')) {
        const data = await res.json();
        console.log('\n🔑 ENV VARS IN PRODUCTION:');
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('env-check returned HTML - still old build?', res.status);
    }
}
