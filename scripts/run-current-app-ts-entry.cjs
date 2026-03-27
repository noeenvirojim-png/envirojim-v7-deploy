#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
process.chdir(appRoot);

const tsNodeRegisterPath = require.resolve('ts-node/register/transpile-only', { paths: [appRoot] });
require(tsNodeRegisterPath);

try {
  const tsconfigPathsRegisterPath = require.resolve('tsconfig-paths/register', { paths: [appRoot] });
  require(tsconfigPathsRegisterPath);
} catch (error) {
  throw new Error(
    'Missing runtime dependency: tsconfig-paths/register inside CURRENT_APP. This bootstrap requires tsconfig-paths to honor @/ aliases.'
  );
}

const entryArg = process.argv[2];
if (!entryArg) {
  throw new Error('Missing TS entry path. Usage: node CURRENT_APP/scripts/run-current-app-ts-entry.cjs <entry.ts> [...args]');
}

if (entryArg === '-e') {
  const code = process.argv[3];
  if (!code) throw new Error('Missing code after -e');
  eval(code);
  process.exit(0);
}

const entryPath = path.resolve(appRoot, entryArg);
if (!fs.existsSync(entryPath)) {
  throw new Error(`Entry file not found: ${entryPath}`);
}

process.argv = [process.argv[0], entryPath, ...process.argv.slice(3)];
require(entryPath);
