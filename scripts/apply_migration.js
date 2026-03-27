const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function applyMigration() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260319000000_ultimate_machine_pdf_intelligence.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- APPLYING MIGRATION ---');
  
  try {
    // Basic split by semicolon - handles most cases but be careful with functions/DO blocks
    // For DO blocks and Functions, we might need a more sophisticated parser or just use the big block.
    // Actually, Postgres can execute a whole script if passed correctly.
    
    await client.query(sql);
    console.log('[OK] Migration applied successfully.');
  } catch (err) {
    console.error('[FAIL] Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
