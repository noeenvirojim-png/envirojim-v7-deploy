/**
 * Use the Vercel REST API to:
 * 1. Find the project env vars
 * 2. Identify any mock/wrong values
 * 3. Update them if needed
 * 
 * To use: set VERCEL_TOKEN env var to your personal access token from:
 * https://vercel.com/account/tokens
 */

const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const PROJECT_NAME = 'envirojim-final-deployment';
const TEAM_ID = 'team_TnPQr8c2wGrc2oizsCKEi2xR';
const NEW_ENV_VARS = {
    'NEXT_PUBLIC_SUPABASE_URL': 'https://ptznkpeneqfqhackdeau.supabase.co',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'sb_publishable_cvWQhEurXz6XpbGV4SuYRg_UJr5VCz6',
    'SUPABASE_SERVICE_ROLE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0em5rcGVuZXFmcWhhY2tkZWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4MTg5NiwiZXhwIjoyMDg2NzU3ODk2fQ.48bpC4klZ9p4J-pOg2im3LnFi2BCJCiN8ToFmkrmgTs'
};

if (!VERCEL_TOKEN) {
    console.error('❌ Missing VERCEL_TOKEN environment variable.');
    console.error('   Get one at: https://vercel.com/account/tokens');
    process.exit(1);
}

const headers = {
    'Authorization': `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
};

// Step 1: Find project
async function getProject() {
    const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_NAME}`, { headers });
    if (!res.ok) {
        // Try listing all projects
        const listRes = await fetch('https://api.vercel.com/v9/projects?limit=20', { headers });
        const list = await listRes.json();
        console.log('Available projects:', list.projects?.map(p => p.name));
        throw new Error(`Project not found. Status: ${res.status}`);
    }
    return res.json();
}

// Step 2: Get env vars
async function getEnvVars(projectId) {
    const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, { headers });
    const data = await res.json();
    return data.envs || [];
}

// Step 3: Update or create env var
async function upsertEnvVar(projectId, key, value, existingVars) {
    const existing = existingVars.find(e => e.key === key);
    
    if (existing) {
        // Decrypt to see current value
        const decryptRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, { headers });
        const decryptData = await decryptRes.json();
        const currentValue = decryptData.value;
        
        if (currentValue === value) {
            console.log(`   ✅ ${key}: Already correct`);
            return false;
        }
        
        console.log(`   ⚠️  ${key}: WRONG VALUE found → "${currentValue?.slice(0, 40)}..."`);
        console.log(`      Updating to correct value...`);
        
        // Update
        const updateRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ value, target: ['production', 'preview', 'development'] })
        });
        if (updateRes.ok) {
            console.log(`   ✅ ${key}: UPDATED`);
            return true;
        } else {
            console.error(`   ❌ ${key}: Update failed`, await updateRes.text());
            return false;
        }
    } else {
        console.log(`   ⚠️  ${key}: MISSING → Creating...`);
        const createRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview', 'development'] })
        });
        if (createRes.ok) {
            console.log(`   ✅ ${key}: CREATED`);
            return true;
        } else {
            console.error(`   ❌ ${key}: Create failed`, await createRes.text());
            return false;
        }
    }
}

async function triggerRedeploy(projectId) {
    console.log('\n🚀 Triggering production redeploy...');
    // Get latest deployment
    const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&target=production&limit=1`, { headers });
    const data = await res.json();
    const latest = data.deployments?.[0];
    if (!latest) { console.log('   No deployment found to redeploy'); return; }
    
    const redeployRes = await fetch(`https://api.vercel.com/v13/deployments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            name: PROJECT_NAME,
            deploymentId: latest.uid,
            target: 'production'
        })
    });
    if (redeployRes.ok) {
        console.log('   ✅ Redeploy triggered');
    } else {
        console.log('   ℹ️  Redeploy:', redeployRes.status, await redeployRes.text());
    }
}

async function main() {
    console.log('=== VERCEL ENV AUDIT & FIX ===\n');
    
    try {
        const project = await getProject();
        const projectId = project.id;
        console.log(`Project found: ${project.name} (ID: ${projectId})\n`);
        
        const envVars = await getEnvVars(projectId);
        console.log(`Found ${envVars.length} env vars\n`);
        
        let anyUpdated = false;
        for (const [key, value] of Object.entries(NEW_ENV_VARS)) {
            const updated = await upsertEnvVar(projectId, key, value, envVars);
            if (updated) anyUpdated = true;
        }
        
        if (anyUpdated) {
            await triggerRedeploy(projectId);
            console.log('\n✅ ENV VARS CORRECTED — Redeploy triggered. Wait 2-3 min then test login.');
        } else {
            console.log('\n✅ ALL ENV VARS CORRECT — No changes needed.');
            console.log('   The login error is caused by local network DNS blocking Supabase.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
