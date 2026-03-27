import fs from 'node:fs'
import path from 'node:path'

const envPath = path.resolve('./.env.production');
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

async function main() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) throw new Error('Missing POSTGRES_URL');

  const migrationSql = fs.readFileSync(
    path.resolve('./supabase/migrations/20260324010000_add_status_columns.sql'),
    'utf8'
  );

  const { Client } = await import('pg');
  const client = new Client({ connectionString: postgresUrl });

  await client.connect();
  await client.query(migrationSql);
  await client.end();

  console.log('[OK] Status columns added');
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
