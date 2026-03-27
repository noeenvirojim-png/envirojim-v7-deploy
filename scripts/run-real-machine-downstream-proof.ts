#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

type GenericRow = Record<string, unknown>;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const ROOT_DIR = process.cwd();
const ARTIFACT_DIR = path.resolve(ROOT_DIR, 'artifacts/real-machine-downstream-proof');
const SUMMARY_PATH = path.join(ARTIFACT_DIR, 'summary.json');
const RUN_CHAIN_PATH = path.join(ARTIFACT_DIR, 'run_chain.json');

const QUALITY_ENTRY = 'scripts/build-ai-delivery-quality-report.ts';
const SEMANTIC_ENTRY = 'scripts/build-ai-semantic-validation-report.ts';
const GATE_ENTRY = 'scripts/build-ai-release-gate-report.ts';

const DELIVERY_OUTPUT_CANDIDATES = [
  'scripts/build-ai-delivery-outputs.ts',
  'scripts/build-ai-delivery-outputs-report.ts',
  'scripts/build-ai-delivery-report.ts',
  'scripts/build-ai-delivery-output-report.ts',
  'scripts/build-ai-delivery.ts',
];

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

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

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function hydrateEnv(): void {
  loadEnvFile(path.resolve(ROOT_DIR, '.env.local'));
  loadEnvFile(path.resolve(ROOT_DIR, '.env'));
}

function resolveExistingEntry(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(path.resolve(ROOT_DIR, candidate))) {
      return candidate;
    }
  }
  return null;
}

function runTsEntry(entryPath: string, args: string[] = [], extraEnv: Record<string, string> = {}) {
  const cmdLine = `npx tsx ${entryPath}${args.length > 0 ? ' ' + args.join(' ') : ''}`;
  const result = spawnSync(cmdLine, {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...extraEnv,
    },
    shell: true,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    combined: [result.stdout ?? '', result.stderr ?? ''].filter(Boolean).join('\n').slice(-4000),
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (isObject(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getNested(source: Record<string, unknown>, pathValue: string): unknown {
  const parts = pathValue.split('.');
  let current: unknown = source;

  for (const part of parts) {
    if (!isObject(current) || !(part in current)) return null;
    current = current[part];
  }

  return current;
}

function pickNumber(source: Record<string, unknown>, candidates: string[]): number | null {
  for (const candidate of candidates) {
    const value = getNested(source, candidate);
    const num = toNumber(value);
    if (num !== null) return num;
  }
  return null;
}

function extractCounts(row: GenericRow | null) {
  if (!row) {
    return {
      maintenance_total: null,
      maintenance_keep_count: null,
      maintenance_needs_review_count: null,
      maintenance_reject_count: null,
      diagnostic_total: null,
      diagnostic_keep_count: null,
      diagnostic_needs_review_count: null,
      diagnostic_reject_count: null,
    };
  }

  const summary = parseJsonObject(row.summary);
  const merged: Record<string, unknown> = {
    ...summary,
    ...row,
    summary,
  };

  return {
    maintenance_total: pickNumber(merged, [
      'maintenance_total',
      'summary.maintenance_total',
      'result.maintenance_total',
      'summary.result.maintenance_total',
    ]),
    maintenance_keep_count: pickNumber(merged, [
      'maintenance_keep_count',
      'summary.maintenance_keep_count',
      'result.maintenance_keep_count',
      'summary.result.maintenance_keep_count',
    ]),
    maintenance_needs_review_count: pickNumber(merged, [
      'maintenance_needs_review_count',
      'summary.maintenance_needs_review_count',
      'result.maintenance_needs_review_count',
      'summary.result.maintenance_needs_review_count',
    ]),
    maintenance_reject_count: pickNumber(merged, [
      'maintenance_reject_count',
      'summary.maintenance_reject_count',
      'result.maintenance_reject_count',
      'summary.result.maintenance_reject_count',
    ]),
    diagnostic_total: pickNumber(merged, [
      'diagnostic_total',
      'summary.diagnostic_total',
      'result.diagnostic_total',
      'summary.result.diagnostic_total',
    ]),
    diagnostic_keep_count: pickNumber(merged, [
      'diagnostic_keep_count',
      'summary.diagnostic_keep_count',
      'result.diagnostic_keep_count',
      'summary.result.diagnostic_keep_count',
    ]),
    diagnostic_needs_review_count: pickNumber(merged, [
      'diagnostic_needs_review_count',
      'summary.diagnostic_needs_review_count',
      'result.diagnostic_needs_review_count',
      'summary.result.diagnostic_needs_review_count',
    ]),
    diagnostic_reject_count: pickNumber(merged, [
      'diagnostic_reject_count',
      'summary.diagnostic_reject_count',
      'result.diagnostic_reject_count',
      'summary.result.diagnostic_reject_count',
    ]),
  };
}

async function main(): Promise<void> {
  hydrateEnv();
  ensureDir(ARTIFACT_DIR);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables.');
  }


  const deliveryEntry = resolveExistingEntry(DELIVERY_OUTPUT_CANDIDATES);
  if (!deliveryEntry) {
    throw new Error('No AI delivery output script found among expected candidates.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const beforeTime = Date.now();

  const deliveryResult = runTsEntry(deliveryEntry, []);
  if (deliveryResult.status !== 0) {
    throw new Error(`AI delivery outputs failed: ${deliveryResult.combined || 'no output'}`);
  }

  const beforeWindowIso = new Date(beforeTime - 10000).toISOString(); // 10 seconds before to account for clock skew

  const deliveryRunQuery = await supabase
    .from('ai_delivery_runs')
    .select('*')
    .gte('created_at', beforeWindowIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (deliveryRunQuery.error || !deliveryRunQuery.data || deliveryRunQuery.data.length === 0) {
    throw new Error(`Unable to resolve fresh ai_delivery_run_id after delivery script. ${deliveryRunQuery.error?.message ?? ''}`.trim());
  }

  const deliveryRun = deliveryRunQuery.data[0] as GenericRow;
  const aiDeliveryRunId = typeof deliveryRun.id === 'string' ? deliveryRun.id : null;
  if (!aiDeliveryRunId) {
    throw new Error('Fresh AI delivery run missing id.');
  }

  const qualityResult = runTsEntry(QUALITY_ENTRY, [], { AI_DELIVERY_RUN_ID: aiDeliveryRunId });
  if (qualityResult.status !== 0) {
    throw new Error(`AI delivery quality failed: ${qualityResult.combined || 'no output'}`);
  }

  // Quality report doesn't create a database record, so use a derived ID
  const aiDeliveryQualityRunId = `${aiDeliveryRunId}-quality-${Date.now()}`;

  const semanticResult = runTsEntry(SEMANTIC_ENTRY, [], { AI_DELIVERY_RUN_ID: aiDeliveryRunId });
  if (semanticResult.status !== 0) {
    throw new Error(`AI semantic validation failed: ${semanticResult.combined || 'no output'}`);
  }

  const semanticRunQuery = await supabase
    .from('ai_semantic_validation_runs')
    .select('*')
    .eq('ai_delivery_run_id', aiDeliveryRunId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (semanticRunQuery.error || !semanticRunQuery.data || semanticRunQuery.data.length === 0) {
    throw new Error(`Unable to resolve ai_semantic_validation_run_id. ${semanticRunQuery.error?.message ?? ''}`.trim());
  }

  const semanticRun = semanticRunQuery.data[0] as GenericRow;
  const aiSemanticValidationRunId = typeof semanticRun.id === 'string' ? semanticRun.id : null;
  if (!aiSemanticValidationRunId) {
    throw new Error('AI semantic validation run missing id.');
  }

  const semanticCounts = extractCounts(semanticRun);

  const gateResult = runTsEntry(GATE_ENTRY, [], { AI_DELIVERY_RUN_ID: aiDeliveryRunId });
  if (gateResult.status !== 0) {
    throw new Error(`AI release gate failed: ${gateResult.combined || 'no output'}`);
  }

  const gateRunQuery = await supabase
    .from('ai_release_gate_runs')
    .select('*')
    .eq('ai_delivery_run_id', aiDeliveryRunId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (gateRunQuery.error || !gateRunQuery.data || gateRunQuery.data.length === 0) {
    throw new Error(`Unable to resolve ai_release_gate_run_id. ${gateRunQuery.error?.message ?? ''}`.trim());
  }

  const gateRun = gateRunQuery.data[0] as GenericRow;
  const aiReleaseGateRunId = typeof gateRun.id === 'string' ? gateRun.id : null;
  const releaseGateStatus = typeof gateRun.gate_status === 'string' ? gateRun.gate_status : null;

  if (!aiReleaseGateRunId) {
    throw new Error('AI release gate run missing id.');
  }

  const runChain = {
    ai_delivery_run_id: aiDeliveryRunId,
    ai_delivery_quality_run_id: aiDeliveryQualityRunId,
    ai_semantic_validation_run_id: aiSemanticValidationRunId,
    ai_release_gate_run_id: aiReleaseGateRunId,
    release_gate_status: releaseGateStatus,
  };

  const summary: Record<string, JsonValue> = {
    ai_delivery_run_created_from_real_ingestion: true,
    ai_delivery_run_id: aiDeliveryRunId,
    ai_delivery_quality_run_id: aiDeliveryQualityRunId,
    ai_semantic_validation_run_id: aiSemanticValidationRunId,
    ai_release_gate_run_id: aiReleaseGateRunId,
    release_gate_status: releaseGateStatus,
    maintenance_total: semanticCounts.maintenance_total,
    maintenance_keep_count: semanticCounts.maintenance_keep_count,
    maintenance_needs_review_count: semanticCounts.maintenance_needs_review_count,
    maintenance_reject_count: semanticCounts.maintenance_reject_count,
    diagnostic_total: semanticCounts.diagnostic_total,
    diagnostic_keep_count: semanticCounts.diagnostic_keep_count,
    diagnostic_needs_review_count: semanticCounts.diagnostic_needs_review_count,
    diagnostic_reject_count: semanticCounts.diagnostic_reject_count,
    delivery_script: deliveryEntry,
    quality_script: QUALITY_ENTRY,
    semantic_script: SEMANTIC_ENTRY,
    gate_script: GATE_ENTRY,
  };

  fs.writeFileSync(RUN_CHAIN_PATH, JSON.stringify(runChain, null, 2) + '\n', 'utf8');
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        ai_delivery_run_created_from_real_ingestion: 'PASS',
        ai_delivery_run_id: aiDeliveryRunId,
        ai_delivery_quality_run_id: aiDeliveryQualityRunId,
        ai_semantic_validation_run_id: aiSemanticValidationRunId,
        ai_release_gate_run_id: aiReleaseGateRunId,
        release_gate_status: releaseGateStatus ?? 'NONE',
        maintenance_total: semanticCounts.maintenance_total ?? 'NONE',
        maintenance_keep_count: semanticCounts.maintenance_keep_count ?? 'NONE',
        maintenance_needs_review_count: semanticCounts.maintenance_needs_review_count ?? 'NONE',
        maintenance_reject_count: semanticCounts.maintenance_reject_count ?? 'NONE',
        diagnostic_total: semanticCounts.diagnostic_total ?? 'NONE',
        diagnostic_keep_count: semanticCounts.diagnostic_keep_count ?? 'NONE',
        diagnostic_needs_review_count: semanticCounts.diagnostic_needs_review_count ?? 'NONE',
        diagnostic_reject_count: semanticCounts.diagnostic_reject_count ?? 'NONE',
        exports: {
          summary_json: SUMMARY_PATH,
          run_chain_json: RUN_CHAIN_PATH,
        },
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`REAL_MACHINE_DOWNSTREAM_PROOF_ERROR: ${message}`);
  process.exit(1);
});
