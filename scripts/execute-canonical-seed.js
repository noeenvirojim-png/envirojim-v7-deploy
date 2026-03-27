const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function main() {
  const client = new Client({ connectionString });
  try {
    const seedPath = path.resolve(__dirname, '..', 'supabase', 'seeds', '001_local_admin_auth.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    await client.connect();
    console.log('--- APPLYING CANONICAL AUTH SEED ---');
    await client.query(sql);
    console.log('✅ CANONICAL AUTH SEED APPLIED');
  } catch (error) {
    console.error('❌ FAILED TO APPLY SEED:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
