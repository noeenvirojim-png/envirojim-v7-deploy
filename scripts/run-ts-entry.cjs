#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

const entryArg = process.argv[2];
if (!entryArg) {
  throw new Error('Missing TS entry path. Usage: node scripts/run-ts-entry.cjs <entry.ts> [...args]');
}

// Support -e flag for inline evaluation
if (entryArg === '-e') {
  require('ts-node/register/transpile-only');
  try {
    require('tsconfig-paths/register');
  } catch (error) {
    throw new Error('Missing runtime dependency: tsconfig-paths/register');
  }
  const codeArg = process.argv[3];
  if (!codeArg) {
    throw new Error('Missing code for -e flag. Usage: node scripts/run-ts-entry.cjs -e "code"');
  }
  eval(codeArg);
  process.exit(0);
}

// For .ts files, use tsx with spawnSync to avoid shell path issues
const { spawnSync } = require('child_process');
const entryPath = path.resolve(rootDir, entryArg);
const remainingArgs = process.argv.slice(3);
const result = spawnSync('npx', ['tsx', entryPath, ...remainingArgs], {
  cwd: rootDir,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024
});

// Output both stdout and stderr
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  if (!result.stderr && !result.stdout) {
    console.error(`Process exited with code ${result.status}`);
  }
}
process.exit(result.status || 0);
