const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const headers = { 'Authorization': `Bearer ${VERCEL_TOKEN}` };

async function findLatest() {
    const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=20`, { headers });
    const data = await res.json();
    console.log('=== LATEST DEPLOYMENTS ===');
    data.deployments.forEach(d => {
        console.log(`- ${d.uid} | SHA: ${d.meta?.githubCommitSha?.slice(0,8)} | State: ${d.state} | Created: ${new Date(d.createdAt).toLocaleTimeString()}`);
    });
}

findLatest().catch(console.error);
