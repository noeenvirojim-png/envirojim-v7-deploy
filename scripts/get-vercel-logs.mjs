const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const DEPLOY_ID = 'dpl_9QjessWRkdMFb2Gk9GFXobsDmtrv';

async function getDeploy() {
    const res = await fetch(`https://api.vercel.com/v2/deployments/${DEPLOY_ID}?teamId=${TEAM_ID}`, {
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    const d = await res.json();
    console.log('Deployment Details:', JSON.stringify(d, null, 2));
    
    // If it failed, try to get events/logs
    const eventsRes = await fetch(`https://api.vercel.com/v2/deployments/${DEPLOY_ID}/events?teamId=${TEAM_ID}`, {
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    const events = await eventsRes.json();
    console.log('\n--- Build Events/Logs ---');
    console.log('Event count:', events.length);
    events.slice(-50).forEach(e => {
        if (e.payload?.text) {
            console.log(`[${e.type}] ${e.payload.text}`);
        } else if (e.text) {
            console.log(`[${e.type}] ${e.text}`);
        } else {
            // console.log(`[${e.type}] (No text)`);
        }
    });
}

getDeploy().catch(console.error);
