const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function applyMigration() {
  const sqlPath = path.join(process.cwd(), '..', 'supabase', 'migrations', '20260319000000_ultimate_machine_pdf_intelligence.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Using the DB_URL from status.json
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });

  console.log('Applying Ultimate Machine PDF Intelligence Pipeline migration...');
  
  try {
    await client.connect();
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
