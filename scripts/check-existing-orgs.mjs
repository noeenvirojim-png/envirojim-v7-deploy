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

const databaseUrl = process.env.POSTGRES_URL;

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const result = await client.query(`
  SELECT DISTINCT owner_org_id FROM machines LIMIT 5;
`);

console.log('Existing owner_org_ids:', result.rows);

await client.end();
