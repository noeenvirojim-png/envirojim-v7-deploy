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

if (!databaseUrl) {
  throw new Error('Missing POSTGRES_URL');
}

const sql = fs.readFileSync(
  'supabase/migrations/20260324020000_enriched_org_read_indexes.sql',
  'utf8'
);

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
await client.query(sql);
await client.end();

console.log('[OK] Org read indexes applied');
