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

console.log('[1] RLS Status & Ownership:');
const rls = await client.query(`
  SELECT c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity, r.rolname as owner
  FROM pg_class c 
  JOIN pg_roles r ON c.relowner = r.oid
  WHERE c.relname IN ('internal_tickets', 'work_orders', 'part_orders')
`);

rls.rows.forEach(row => {
  console.log(`  ${row.table_name}: RLS=${row.relrowsecurity}, FORCE=${row.relforcerowsecurity}, owner=${row.rolname}`);
});

console.log('\n[2] Policy Definitions:');
const policies = await client.query(`
  SELECT p.polname, p.polrelid::regclass as table_name, p.polcmd, p.polpermissive, p.polroles::text
  FROM pg_policy p
  WHERE p.polrelid IN (
    SELECT oid FROM pg_class WHERE relname IN ('internal_tickets', 'work_orders', 'part_orders')
  )
  ORDER BY table_name, polname
`);

policies.rows.forEach(row => {
  console.log(`  ${row.table_name}.${row.polname}: cmd=${row.polcmd}, permissive=${row.polpermissive}, roles=${row.polroles}`);
});

console.log('\n[3] Current Session Role:');
const role = await client.query(`SELECT current_user, session_user`);
console.log(`  current_user=${role.rows[0].current_user}, session_user=${role.rows[0].session_user}`);

console.log('\n[4] Service Role Privileges:');
const priv = await client.query(`
  SELECT has_table_privilege(current_user, 'internal_tickets'::regclass, 'SELECT')
`);
console.log(`  Can read internal_tickets: ${priv.rows[0].has_table_privilege}`);

console.log('\n[5] current_setting app.current_org_id:');
const setting = await client.query(`SELECT current_setting('app.current_org_id', true) as value`);
console.log(`  Value: ${setting.rows[0].value || 'NULL'}`);

await client.end();
