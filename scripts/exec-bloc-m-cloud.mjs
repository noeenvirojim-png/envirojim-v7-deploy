#!/usr/bin/env node
/**
 * BLOC M Cloud Supabase Execution
 *
 * This script:
 * 1. Backs up current .env.local
 * 2. Temporarily switches to cloud Supabase from .env.production
 * 3. Executes BLOC M
 * 4. Restores original .env.local
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT = process.cwd();
const ENV_LOCAL = path.join(ROOT, '.env.local');
const ENV_PROD = path.join(ROOT, '.env.production');
const ENV_BACKUP = path.join(ROOT, `.env.local.backup-${Date.now()}`);

function readEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [k, ...rest] = line.split('=');
    const v = rest.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    env[k.trim()] = v;
  }
  return env;
}

function writeEnvFile(filePath, env) {
  const lines = [
    '# ENVIROJIM - CLOUD ENVIRONMENT (TEMPORARY FOR BLOC M)',
    '# Restored automatically after BLOC M execution',
    ''
  ];
  for (const [k, v] of Object.entries(env)) {
    if (v) lines.push(`${k}=${v}`);
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

async function executeNode(script) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [script], {
      cwd: ROOT,
      stdio: 'inherit'
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  console.log('[BLOC M] CLOUD SUPABASE EXECUTION');
  console.log('====================================\n');

  try {
    // Step 1: Verify files exist
    if (!fs.existsSync(ENV_LOCAL)) {
      console.log('✗ .env.local not found');
      process.exit(1);
    }
    if (!fs.existsSync(ENV_PROD)) {
      console.log('✗ .env.production not found');
      process.exit(1);
    }

    // Step 2: Backup current .env.local
    console.log('[STEP 1] BACKING UP CURRENT ENVIRONMENT');
    fs.copyFileSync(ENV_LOCAL, ENV_BACKUP);
    console.log(`✓ Backed up to: ${path.basename(ENV_BACKUP)}\n`);

    // Step 3: Read cloud credentials
    console.log('[STEP 2] SWITCHING TO CLOUD SUPABASE');
    const prodEnv = readEnvFile(ENV_PROD);

    if (!prodEnv.NEXT_PUBLIC_SUPABASE_URL || !prodEnv.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('✗ Cloud credentials not found in .env.production');
      fs.copyFileSync(ENV_BACKUP, ENV_LOCAL);
      fs.unlinkSync(ENV_BACKUP);
      process.exit(1);
    }

    // Step 4: Write temporary cloud .env.local
    const cloudEnv = {
      NEXT_PUBLIC_SUPABASE_URL: prodEnv.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: prodEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: prodEnv.SUPABASE_SERVICE_ROLE_KEY,
      POSTGRES_URL: prodEnv.POSTGRES_URL,
      GEMINI_API_KEY: prodEnv.GEMINI_AI_KEY,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SITE_URL: 'https://envirojim.vercel.app'
    };
    writeEnvFile(ENV_LOCAL, cloudEnv);
    console.log(`✓ Switched to cloud: ${prodEnv.NEXT_PUBLIC_SUPABASE_URL}\n`);

    // Step 5: Execute BLOC M
    console.log('[STEP 3] EXECUTING BLOC M');
    console.log('==================================================');
    let blocMSuccess = false;
    try {
      await executeNode('scripts/bloc-m-supabase-closure.mjs');
      blocMSuccess = true;
    } catch (err) {
      console.log(`\n✗ BLOC M Failed: ${err.message}`);
    }
    console.log('==================================================\n');

    // Step 6: Restore original environment
    console.log('[STEP 4] RESTORING LOCAL ENVIRONMENT');
    const originalEnv = readEnvFile(ENV_BACKUP);
    writeEnvFile(ENV_LOCAL, originalEnv);
    console.log('✓ Restored original .env.local\n');
    fs.unlinkSync(ENV_BACKUP);

    // Step 7: Final verdict
    console.log('[STEP 5] FINAL VERDICT');
    if (blocMSuccess) {
      console.log('✓ BLOC M COMPLETED SUCCESSFULLY\n');
      console.log('Next steps:');
      console.log('  1. Review artifacts/bloc-j/review-decisions.csv');
      console.log('  2. Run: node scripts/bloc-j-promote-reviewed-parts.mjs');
      console.log('  3. Run: node scripts/bloc-k-review-ui-smoke.mjs');
      console.log('  4. Run: node scripts/bloc-l-final-parts-readiness.mjs\n');
      process.exit(0);
    } else {
      console.log('✗ BLOC M FAILED\n');
      process.exit(1);
    }
  } catch (err) {
    // Always restore backup on error
    if (fs.existsSync(ENV_BACKUP)) {
      try {
        fs.copyFileSync(ENV_BACKUP, ENV_LOCAL);
        fs.unlinkSync(ENV_BACKUP);
      } catch (e) {
        console.log(`Warning: Could not restore backup: ${e.message}`);
      }
    }
    console.error(`✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
