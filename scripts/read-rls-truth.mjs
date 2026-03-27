import fs from 'fs'
import { Client } from 'pg'

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

const tables = ['internal_tickets', 'work_orders', 'part_orders'];
const results = {};

for (const tbl of tables) {
  const rls = await client.query(`SELECT relrowsecurity FROM pg_class WHERE relname = $1;`, [tbl]);
  const enabled = rls.rows[0]?.relrowsecurity || false;

  const policies = await client.query(`
    SELECT polname, polcmd FROM pg_policy WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = $1);
  `, [tbl]);

  results[tbl] = {
    rls_enabled: enabled,
    policies_count: policies.rows.length,
    policies: policies.rows.map(p => ({ name: p.polname, cmd: p.polcmd }))
  };
}

await client.end();
console.log(JSON.stringify(results, null, 2));
