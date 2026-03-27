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

const tables = ['internal_tickets', 'work_orders', 'part_orders'];
const result = {};

for (const tbl of tables) {
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [tbl]
  );
  result[tbl] = cols.rows.map(r => r.column_name);
}

const machinesCols = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='machines' ORDER BY ordinal_position`
);
result.machines = machinesCols.rows.map(r => r.column_name);

await client.end();
console.log(JSON.stringify(result, null, 2));
