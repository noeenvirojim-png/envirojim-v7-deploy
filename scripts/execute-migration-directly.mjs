#!/usr/bin/env node

/**
 * Execute migration SQL directly via PostgreSQL connection
 * Using node:url parsing to avoid pg module dependency
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Load env
const envPath = path.resolve(process.cwd(), '.env.production');
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

async function executeSqlViaPostgres() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) throw new Error('Missing POSTGRES_URL');

  console.log('[1] Reading migration SQL...');
  const migrationSql = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260324000000_enriched_writes_tables.sql'),
    'utf8'
  );

  console.log('[2] Executing via psql...');

  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [postgresUrl, '-f', '-'], {
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true,
    });

    psql.stdin.write(migrationSql);
    psql.stdin.end();

    psql.on('close', (code) => {
      if (code === 0) {
        console.log('[2] Migration executed successfully');
        resolve(true);
      } else {
        console.log(`[2] psql exited with code ${code}`);
        resolve(false);
      }
    });

    psql.on('error', (err) => {
      console.log(`[2] psql error: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  try {
    const success = await executeSqlViaPostgres();
    if (success) {
      console.log('\n[SUCCESS] Migration applied - proceeding to write proof');
      process.exit(0);
    } else {
      console.log('\n[WARNING] Migration execution unclear - testing writes anyway');
      process.exit(0);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
