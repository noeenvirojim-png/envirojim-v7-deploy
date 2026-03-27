/**
 * Check which deployments are currently READY for the project
 * and which URLs they are assigned to.
 */

const VERCEL_TOKEN = 'vcp_70nxzZyUL0pCslvi78dceWHL0SDdLKKFeI3OgcY4qHmurLKJyT3CgjXX';
const PROJECT_ID = 'prj_tuIHtAwEZ8cIqdAKWHbm5JRN2IIV';
const headers = { 'Authorization': `Bearer ${VERCEL_TOKEN}` };

const res = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=5`, { headers });
const data = await res.json();

console.log('=== PRODUCTION DEPLOYMENTS ===');
for (const d of data.deployments || []) {
    console.log(`\nCommit: ${d.meta?.githubCommitSha?.slice(0, 8) || 'N/A'}`);
    console.log(`State: ${d.state} | Ready: ${d.readyState}`);
    console.log(`Created: ${new Date(d.createdAt).toISOString()}`);
    console.log(`URL: https://${d.url}`);
    console.log(`Alias: ${d.alias?.join(', ') || 'None'}`);
}

// Also check the alias for the main production URL
const aliasRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}`, { headers });
const project = await aliasRes.json();
console.log('\n=== PROJECT PRODUCTION DOMAINS ===');
console.log(project.alias?.map(a => a.domain).join('\n') || 'No aliases');
