/**
 * Assign production alias to the latest deployment via Vercel API
 */
const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const DEPLOY_UID = 'dpl_3gpdzEZadXHYzZv5CwdhJ87ey8xA';
const PROD_ALIAS = 'envirojim-final-deployment.vercel.app';
const headers = { 
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json'
};

async function run() {
    // 1. Get all projects to find the right team/scope
    const meRes = await fetch('https://api.vercel.com/v2/user', { headers });
    const me = await meRes.json();
    console.log('User:', me.user?.username, me.user?.email);

    // 2. Get teams
    const teamsRes = await fetch('https://api.vercel.com/v2/teams', { headers });
    const teams = await teamsRes.json();
    console.log('Teams:', teams.teams?.map(t => `${t.name} (${t.id})`));

    // 3. Get latest deployment
    const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
    const deplyRes = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1`, { headers });
    const deplyData = await deplyRes.json();
    const latest = deplyData.deployments?.[0];
    
    if (!latest) { console.log('No deployment'); return; }
    console.log('\nLatest deployment:', latest.uid, '|', latest.url);
    console.log('Deployment created:', new Date(latest.createdAt).toISOString());

    // 4. Assign the production alias
    const PROD_ALIAS = 'envirojim-final-deployment.vercel.app';
    console.log('\nAssigning alias:', PROD_ALIAS, '→', latest.uid);
    
    const assignRes = await fetch(`https://api.vercel.com/v2/deployments/${latest.uid}/aliases`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ alias: PROD_ALIAS })
    });
    const assignData = await assignRes.json();
    console.log('Alias assignment status:', assignRes.status);
    console.log('Response:', JSON.stringify(assignData, null, 2));
    
    // 5. Test the production URL
    if (assignRes.status === 200 || assignRes.status === 201) {
        console.log('\n✅ Alias assigned! Waiting 3s then testing production URL...');
        await new Promise(r => setTimeout(r, 3000));
        
        const testRes = await fetch('https://envirojim-final-deployment.vercel.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'noe@envirojim.com', password: '@Enviro2018!' })
        });
        const testData = await testRes.json();
        console.log('Login test:', testRes.status, JSON.stringify(testData));
    }
}

run().catch(console.error);
