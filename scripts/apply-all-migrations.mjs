import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const migrationsDir = path.join(ROOT, 'supabase', 'migrations');

console.log('[MIGRATIONS] Applying all migrations to CURRENT_APP stack');
console.log('======================================================\n');

const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`[INFO] Found ${migrations.length} migration files\n`);

let applied = 0;
let failed = 0;

for (const migFile of migrations) {
  const filePath = path.join(migrationsDir, migFile);

  try {
    console.log(`[${applied + failed + 1}/${migrations.length}] Applying: ${migFile}`);

    // Copy migration file into docker container
    execSync(
      `docker cp "${filePath}" supabase_db_CURRENT_APP:/tmp/${migFile}`,
      { stdio: 'pipe' }
    );

    // Execute migration from container
    execSync(
      `docker exec supabase_db_CURRENT_APP psql -U postgres -d postgres -f /tmp/${migFile}`,
      { stdio: 'pipe' }
    );

    applied++;
    console.log(`  ✓ Success\n`);
  } catch (err) {
    const errMsg = err.message || err.toString();
    if (errMsg.includes('already exists') || errMsg.includes('duplicate key')) {
      console.log(`  ⚠ Already exists (skipped)\n`);
      applied++;
    } else {
      console.log(`  ✗ Failed: ${errMsg.slice(0, 80)}\n`);
      failed++;
    }
  }
}

console.log(`\n[RESULT] Applied: ${applied}/${migrations.length}, Failed: ${failed}`);

if (failed > 0) {
  console.log('[WARNING] Some migrations failed.');
}

process.exit(failed > 3 ? 1 : 0);
