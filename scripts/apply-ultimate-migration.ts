import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

async function applyMigration() {
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '20260319000000_ultimate_intelligence_pipeline.sql');
  const sqlContent = readFileSync(sqlPath, 'utf8');

  // Using the DB_URL from status.json
  const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres');

  console.log('Applying Ultimate Intelligence Pipeline migration...');
  
  try {
    await sql.unsafe(sqlContent);
    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
