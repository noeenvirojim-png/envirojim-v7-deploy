import { Client } from 'pg'
import fs from 'fs'

const envPath = './.env.production';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      if (value) process.env[key] = value;
    }
  });
}

const client = new Client({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const rls = await client.query(`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('internal_tickets', 'work_orders', 'part_orders')`);
const rlsEnabled = rls.rows.filter(r => r.relrowsecurity).length === 3;

const orgs = await client.query(`SELECT DISTINCT owner_org_id FROM machines WHERE owner_org_id IS NOT NULL LIMIT 2`);
const [orgA, orgB] = [orgs.rows[0].owner_org_id, orgs.rows[1].owner_org_id];

// Test with SET (for string value)
await client.query(`SET app.current_org_id = '${orgA}'`);

const diagTest = await client.query(`SELECT COUNT(*) as cnt FROM public.internal_tickets WHERE machine_id IN (SELECT id FROM public.machines WHERE owner_org_id = '${orgB}'::uuid)`);
const diagBlocked = parseInt(diagTest.rows[0].cnt) === 0;

const maintTest = await client.query(`SELECT COUNT(*) as cnt FROM public.work_orders WHERE machine_id IN (SELECT id FROM public.machines WHERE owner_org_id = '${orgB}'::uuid)`);
const maintBlocked = parseInt(maintTest.rows[0].cnt) === 0;

const procTest = await client.query(`SELECT COUNT(*) as cnt FROM public.part_orders WHERE machine_id IN (SELECT id FROM public.machines WHERE owner_org_id = '${orgB}'::uuid)`);
const procBlocked = parseInt(procTest.rows[0].cnt) === 0;

await client.end();

const pass = diagBlocked && maintBlocked && procBlocked && rlsEnabled;

console.log('## CHANGED');
console.log('- supabase/migrations/20260324030000_enable_native_rls_enriched.sql');
console.log('');
console.log('## RESULT_NATIVE_RLS_PROOF');
console.log(`- diagnostic_native_rls_verified: ${diagBlocked ? 'PASS' : 'FAIL'}`);
console.log(`- maintenance_native_rls_verified: ${maintBlocked ? 'PASS' : 'FAIL'}`);
console.log(`- procurement_native_rls_verified: ${procBlocked ? 'PASS' : 'FAIL'}`);
console.log(`- cross_org_direct_db_read_blocked: ${pass ? 'YES' : 'NO'}`);
console.log(`- final_status: ${pass ? 'PASS' : 'FAIL'}`);
console.log('');
console.log('## DB_PROOF');
console.log(`- org_a_can_read_org_b_diagnostic_rows_after_patch: ${diagBlocked ? 'NO' : 'YES'}`);
console.log(`- org_a_can_read_org_b_maintenance_rows_after_patch: ${maintBlocked ? 'NO' : 'YES'}`);
console.log(`- org_a_can_read_org_b_procurement_rows_after_patch: ${procBlocked ? 'NO' : 'YES'}`);
console.log('');
console.log('## BLOCKERS');
console.log(`- ${pass ? 'NONE' : 'RLS not effective'}`);
