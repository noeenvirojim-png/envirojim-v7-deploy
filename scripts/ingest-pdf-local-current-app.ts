#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { processManualIngestionPipeline } from '@/domain/ai/pipelines/ingestion-pipeline';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = stripQuotes(trimmed.slice(eqIndex + 1));

    if (!process.env[key]) process.env[key] = value;
  }
}

function hydrateEnv(): void {
  const appRoot = process.cwd();
  loadEnvFile(path.resolve(appRoot, '.env.local'));
  loadEnvFile(path.resolve(appRoot, '.env'));
  loadEnvFile(path.resolve(appRoot, '..', '.env.local'));
  loadEnvFile(path.resolve(appRoot, '..', '.env'));
}

function resolvePdfPath(inputArg: string, folderPath: string | null): string {
  if (!inputArg) throw new Error('Missing PDF input argument.');

  if (path.isAbsolute(inputArg)) {
    return inputArg;
  }

  if (folderPath) {
    const combined = path.resolve(folderPath, inputArg);
    if (fs.existsSync(combined)) return combined;
  }

  const cwdResolved = path.resolve(process.cwd(), inputArg);
  if (fs.existsSync(cwdResolved)) return cwdResolved;

  throw new Error(`Unable to resolve PDF path from input: ${inputArg}`);
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function extractMaybeId(result: unknown, candidateKeys: string[]): string | null {
  if (!result || typeof result !== 'object') return null;
  const source = result as Record<string, unknown>;
  for (const key of candidateKeys) {
    const value = source[key];
    const text = safeString(value);
    if (text) return text;
  }
  return null;
}

async function main(): Promise<void> {
  hydrateEnv();

  const inputArg = process.argv[2];
  const folderPath = process.env.FOLDER_PATH ?? null;
  const machineId = process.env.MACHINE_ID ?? process.env.NEXT_PUBLIC_DEFAULT_MACHINE_ID ?? null;
  const organizationId = process.env.ORGANIZATION_ID ?? process.env.DEFAULT_ORGANIZATION_ID ?? null;

  if (!machineId) {
    throw new Error('Missing MACHINE_ID / NEXT_PUBLIC_DEFAULT_MACHINE_ID for local ingestion.');
  }

  if (!organizationId) {
    throw new Error('Missing ORGANIZATION_ID / DEFAULT_ORGANIZATION_ID for local ingestion.');
  }

  const absolutePath = resolvePdfPath(inputArg, folderPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`PDF not found: ${absolutePath}`);
  }

  const fileName = path.basename(absolutePath);
  const storageUrl = `file://${absolutePath}`;

  const result = await processManualIngestionPipeline(
    machineId,
    storageUrl,
    organizationId
  );

  const payload: Record<string, JsonValue> = {
    file_name: fileName,
    absolute_path: absolutePath,
    ingestion_status: 'PASS',
    machine_id: machineId,
    organization_id: organizationId,
    storage_url: storageUrl,
    document_id: extractMaybeId(result, ['documentId', 'machineDocumentId', 'document_id']),
    kb_id: extractMaybeId(result, ['kbId', 'machineKbId', 'kb_id']),
    raw_result_keys:
      result && typeof result === 'object'
        ? Object.keys(result as Record<string, unknown>)
        : [],
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const inputArg = process.argv[2] ?? null;
  const folderPath = process.env.FOLDER_PATH ?? null;

  console.log(
    JSON.stringify(
      {
        file_name: inputArg,
        absolute_path: folderPath && inputArg ? path.resolve(folderPath, inputArg) : inputArg,
        ingestion_status: 'FAIL',
        error_message: message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
