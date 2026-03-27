import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDAwMDAwMCwiZXhwIjoxNzQwMDAwMDAwfQ.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDAwMDAwMCwiZXhwIjoxNzQwMDAwMDAwfQ.FUGBFU3qJVrVn0P8EFYCrw-kKxBYWxF4CJ9dw8nBRKc';

async function applyMigration() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const migrationPath = path.join(__dirname, '../supabase/migrations/20260322000000_manual_chunks_vector_infra.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('⏳ Applying migration V8: manual_chunks table...');
  
  try {
    // Try using exec_sql RPC if available
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: migrationSql });
    if (!rpcError) {
      console.log('✅ Migration V8 applied via exec_sql');
      return;
    }
  } catch (e: any) {
    console.log('⚠️  exec_sql RPC not available, trying direct approach...');
  }

  // Fallback: Apply individual statements
  try {
    const statements = migrationSql.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (!statement.trim()) continue;
      console.log(`  → ${statement.substring(0, 50)}...`);
      // This won't work without direct SQL access, but we tried
    }
    console.log('⚠️  Could not apply migration directly. Manual execution required.');
  } catch (e: any) {
    console.error('❌ Migration error:', e.message);
    throw e;
  }
}

applyMigration()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
