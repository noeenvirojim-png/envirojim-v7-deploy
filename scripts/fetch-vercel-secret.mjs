import fetch from 'node-fetch';

const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';

async function getVercelEnv() {
    console.log('Fetching Vercel Env Vars...');
    const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    
    if (!response.ok) {
        console.error('Failed to fetch Vercel env:', response.statusText);
        return;
    }
    
    const data = await response.json();
    const dbUrlEnv = data.envs.find(e => e.key === 'POSTGRES_URL' || e.key === 'DATABASE_URL');
    
    if (dbUrlEnv) {
        console.log(`FOUND ${dbUrlEnv.key}: [REDACTED]`);
        // Note: To get the actual value, we might need to fetch the specific env var ID if it's sensitive
        // But usually, the API returns the Decrypted value if authorized or we can use another endpoint.
        // Let's try to see if 'value' is present.
        console.log('Value present:', !!dbUrlEnv.value);
        if (dbUrlEnv.value) {
             console.log('VALUE:', dbUrlEnv.value);
        }
    } else {
        console.log('DATABASE_URL or POSTGRES_URL NOT FOUND in Vercel.');
    }
}

getVercelEnv().catch(console.error);
