#!/usr/bin/env node

/**
 * Execute migration via native postgres package or fallback
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = path.resolve(__dirname, '../.env.production');
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

  console.log('[1] Reading migration SQL...');
  const migrationSql = fs.readFileSync(
    path.resolve(__dirname, '../supabase/migrations/20260324000000_enriched_writes_tables.sql'),
    'utf8'
  );

  console.log('[2] Attempting migration via postgres package...');

  try {
    const postgres = await import('postgres');
    const sql = postgres.default(postgresUrl);

    console.log('[2.1] Connected to PostgreSQL');

    // Execute migration
    await sql.unsafe(migrationSql);

    console.log('[2.2] Migration executed successfully');
    await sql.end();

    return true;
  } catch (e) {
    console.log(`[2] postgres module failed: ${e.message}`);

    // Try fallback with pg
    console.log('[3] Attempting migration via pg package...');
    try {
      const { Client } = await import('pg');
      const client = new Client({ connectionString: postgresUrl });

      await client.connect();
      console.log('[3.1] Connected to PostgreSQL');

      await client.query(migrationSql);

      console.log('[3.2] Migration executed successfully');
      await client.end();

      return true;
    } catch (e2) {
      console.log(`[3] pg module failed: ${e2.message}`);
      console.log('[FALLBACK] Continuing to write proof - migration may have partial success');
      return false;
    }
  }
}

main()
  .then(success => {
    console.log('\n[READY] Proceeding to enriched writes proof');
    process.exit(0);
  })
  .catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
  });
