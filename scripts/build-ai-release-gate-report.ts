#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type GenericRow = Record<string, unknown>;

type Counts = {
  maintenance_total: number | null;
  maintenance_keep_count: number | null;
  maintenance_needs_review_count: number | null;
  maintenance_reject_count: number | null;
  diagnostic_total: number | null;
  diagnostic_keep_count: number | null;
  diagnostic_needs_review_count: number | null;
  diagnostic_reject_count: number | null;
};

type GateCheck = {
  check_key: string;
  severity: 'ERROR' | 'WARN' | 'INFO';
  passed: boolean;
  actual_value: JsonValue;
  expected_value: JsonValue;
  details: string | null;
};

const SCRIPT_NAME = 'scripts/build-ai-release-gate-report.ts';
const ARTIFACT_DIR = path.resolve(process.cwd(), 'artifacts/ai-release-gate');
const SUMMARY_PATH = path.join(ARTIFACT_DIR, 'summary.json');
const CHECKS_CSV_PATH = path.join(ARTIFACT_DIR, 'gate_checks.csv');

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
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));
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

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'pass' || v === 'passed') return true;
    if (v === 'false' || v === 'fail' || v === 'failed') return false;
  }
  return null;
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

function extractCounts(row: GenericRow | null): Counts {
  const empty: Counts = {
    maintenance_total: null,
    maintenance_keep_count: null,
    maintenance_needs_review_count: null,
    maintenance_reject_count: null,
    diagnostic_total: null,
    diagnostic_keep_count: null,
    diagnostic_needs_review_count: null,
    diagnostic_reject_count: null,
  };

  if (!row) return empty;

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

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>): void {
  if (!rows.length) {
    fs.writeFileSync(filePath, 'check_key,severity,passed,actual_value,expected_value,details\n', 'utf8');
    return;
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ];

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function valueOrNull<T>(value: T | undefined | null): T | null {
  return value ?? null;
}

async function selectLatestWithCandidates(
  supabase: any,
  tableName: string,
  filterValue: string | null,
  candidateFilterColumns: string[]
): Promise<GenericRow | null> {
  if (filterValue) {
    for (const column of candidateFilterColumns) {
      const query = await supabase
        .from(tableName)
        .select('*')
        .eq(column, filterValue)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!query.error && query.data && query.data.length > 0) {
        return (query.data[0] ?? null) as GenericRow | null;
      }
    }
  }

  const fallback = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fallback.error) {
    throw new Error(`${tableName}: ${fallback.error.message}`);
  }

  return ((fallback.data ?? [])[0] ?? null) as GenericRow | null;
}

function makeCheck(
  check_key: string,
  severity: 'ERROR' | 'WARN' | 'INFO',
  passed: boolean,
  actual_value: JsonValue,
  expected_value: JsonValue,
  details: string | null
): GateCheck {
  return { check_key, severity, passed, actual_value, expected_value, details };
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

  const supabase = createClient(supabaseUrl, supabaseKey);

  let aiDeliveryRunId = process.env.AI_DELIVERY_RUN_ID ?? null;

  if (!aiDeliveryRunId) {
    const latestDeliveryRun = await supabase
      .from('ai_delivery_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestDeliveryRun.error) {
      throw new Error(`ai_delivery_runs: ${latestDeliveryRun.error.message}`);
    }

    const row = ((latestDeliveryRun.data ?? [])[0] ?? null) as GenericRow | null;
    const resolved = row?.id;
    if (typeof resolved !== 'string' || !resolved) {
      throw new Error('No ai_delivery_run_id could be resolved.');
    }
    aiDeliveryRunId = resolved;
  }

  const qualityRun = await selectLatestWithCandidates(
    supabase,
    'ai_delivery_quality_runs',
    aiDeliveryRunId,
    ['ai_delivery_run_id', 'delivery_run_id', 'run_id']
  );

  const semanticRun = await selectLatestWithCandidates(
    supabase,
    'ai_semantic_validation_runs',
    aiDeliveryRunId,
    ['ai_delivery_run_id', 'delivery_run_id', 'run_id']
  );

  const qualityCounts = extractCounts(qualityRun);
  const semanticCounts = extractCounts(semanticRun);

  const qualityRunId = typeof qualityRun?.id === 'string' ? qualityRun.id : null;
  const semanticRunId = typeof semanticRun?.id === 'string' ? semanticRun.id : null;

  const checks: GateCheck[] = [];

  checks.push(
    makeCheck(
      'delivery_quality_run_exists',
      'ERROR',
      !!qualityRunId,
      { ai_delivery_quality_run_id: qualityRunId },
      { ai_delivery_quality_run_id: 'non-null' },
      qualityRunId ? 'AI delivery quality run found.' : 'Missing AI delivery quality run.'
    )
  );

  checks.push(
    makeCheck(
      'semantic_validation_run_exists',
      'ERROR',
      !!semanticRunId,
      { ai_semantic_validation_run_id: semanticRunId },
      { ai_semantic_validation_run_id: 'non-null' },
      semanticRunId ? 'AI semantic validation run found.' : 'Missing AI semantic validation run.'
    )
  );

  checks.push(
    makeCheck(
      'maintenance_total_positive',
      'ERROR',
      (semanticCounts.maintenance_total ?? 0) > 0,
      { maintenance_total: semanticCounts.maintenance_total },
      { maintenance_total: '> 0' },
      'Semantic validation must include maintenance items.'
    )
  );

  checks.push(
    makeCheck(
      'diagnostic_total_positive',
      'ERROR',
      (semanticCounts.diagnostic_total ?? 0) > 0,
      { diagnostic_total: semanticCounts.diagnostic_total },
      { diagnostic_total: '> 0' },
      'Semantic validation must include diagnostic items.'
    )
  );

  checks.push(
    makeCheck(
      'maintenance_all_keep',
      'ERROR',
      semanticCounts.maintenance_total !== null &&
        semanticCounts.maintenance_keep_count !== null &&
        semanticCounts.maintenance_total === semanticCounts.maintenance_keep_count,
      {
        maintenance_total: semanticCounts.maintenance_total,
        maintenance_keep_count: semanticCounts.maintenance_keep_count,
      },
      { maintenance_total_equals_maintenance_keep_count: true },
      'All maintenance items must be KEEP.'
    )
  );

  checks.push(
    makeCheck(
      'maintenance_zero_needs_review',
      'ERROR',
      (semanticCounts.maintenance_needs_review_count ?? 0) === 0,
      { maintenance_needs_review_count: semanticCounts.maintenance_needs_review_count },
      { maintenance_needs_review_count: 0 },
      'Maintenance NEEDS_REVIEW count must be 0.'
    )
  );

  checks.push(
    makeCheck(
      'maintenance_zero_reject',
      'ERROR',
      (semanticCounts.maintenance_reject_count ?? 0) === 0,
      { maintenance_reject_count: semanticCounts.maintenance_reject_count },
      { maintenance_reject_count: 0 },
      'Maintenance REJECT count must be 0.'
    )
  );

  checks.push(
    makeCheck(
      'diagnostic_all_keep',
      'ERROR',
      semanticCounts.diagnostic_total !== null &&
        semanticCounts.diagnostic_keep_count !== null &&
        semanticCounts.diagnostic_total === semanticCounts.diagnostic_keep_count,
      {
        diagnostic_total: semanticCounts.diagnostic_total,
        diagnostic_keep_count: semanticCounts.diagnostic_keep_count,
      },
      { diagnostic_total_equals_diagnostic_keep_count: true },
      'All diagnostic items must be KEEP.'
    )
  );

  checks.push(
    makeCheck(
      'diagnostic_zero_needs_review',
      'ERROR',
      (semanticCounts.diagnostic_needs_review_count ?? 0) === 0,
      { diagnostic_needs_review_count: semanticCounts.diagnostic_needs_review_count },
      { diagnostic_needs_review_count: 0 },
      'Diagnostic NEEDS_REVIEW count must be 0.'
    )
  );

  checks.push(
    makeCheck(
      'diagnostic_zero_reject',
      'ERROR',
      (semanticCounts.diagnostic_reject_count ?? 0) === 0,
      { diagnostic_reject_count: semanticCounts.diagnostic_reject_count },
      { diagnostic_reject_count: 0 },
      'Diagnostic REJECT count must be 0.'
    )
  );

  checks.push(
    makeCheck(
      'quality_vs_semantic_maintenance_totals_match',
      'WARN',
      qualityCounts.maintenance_total !== null &&
        semanticCounts.maintenance_total !== null &&
        qualityCounts.maintenance_total === semanticCounts.maintenance_total,
      {
        quality_maintenance_total: qualityCounts.maintenance_total,
        semantic_maintenance_total: semanticCounts.maintenance_total,
      },
      { quality_maintenance_total_equals_semantic_maintenance_total: true },
      'Maintenance totals should match between quality and semantic runs.'
    )
  );

  checks.push(
    makeCheck(
      'quality_vs_semantic_diagnostic_totals_match',
      'WARN',
      qualityCounts.diagnostic_total !== null &&
        semanticCounts.diagnostic_total !== null &&
        qualityCounts.diagnostic_total === semanticCounts.diagnostic_total,
      {
        quality_diagnostic_total: qualityCounts.diagnostic_total,
        semantic_diagnostic_total: semanticCounts.diagnostic_total,
      },
      { quality_diagnostic_total_equals_semantic_diagnostic_total: true },
      'Diagnostic totals should match between quality and semantic runs.'
    )
  );

  const gateStatus = checks.some((check) => check.severity === 'ERROR' && !check.passed) ? 'FAIL' : 'PASS';

  const summary = {
    ai_delivery_run_id: aiDeliveryRunId,
    ai_delivery_quality_run_id: qualityRunId,
    ai_semantic_validation_run_id: semanticRunId,
    gate_status: gateStatus,
    counts: {
      quality: qualityCounts,
      semantic: semanticCounts,
    },
    checks: {
      total: checks.length,
      passed: checks.filter((check) => check.passed).length,
      failed: checks.filter((check) => !check.passed).length,
      failed_error: checks.filter((check) => check.severity === 'ERROR' && !check.passed).length,
      failed_warn: checks.filter((check) => check.severity === 'WARN' && !check.passed).length,
    },
    created_by_script: SCRIPT_NAME,
  };

  const insertedRun = await supabase
    .from('ai_release_gate_runs')
    .insert({
      ai_delivery_run_id: aiDeliveryRunId,
      ai_delivery_quality_run_id: valueOrNull(qualityRunId),
      ai_semantic_validation_run_id: valueOrNull(semanticRunId),
      gate_status: gateStatus,
      summary,
      created_by_script: SCRIPT_NAME,
    })
    .select('*')
    .single();

  if (insertedRun.error) {
    throw new Error(`ai_release_gate_runs insert: ${insertedRun.error.message}`);
  }

  const releaseGateRunId =
    typeof insertedRun.data?.id === 'string' && insertedRun.data.id
      ? insertedRun.data.id
      : null;

  if (!releaseGateRunId) {
    throw new Error('Release gate run insert did not return an id.');
  }

  const checksPayload = checks.map((check) => ({
    ai_release_gate_run_id: releaseGateRunId,
    check_key: check.check_key,
    severity: check.severity,
    passed: check.passed,
    actual_value: check.actual_value,
    expected_value: check.expected_value,
    details: check.details,
  }));

  const insertedChecks = await supabase.from('ai_release_gate_checks').insert(checksPayload);
  if (insertedChecks.error) {
    throw new Error(`ai_release_gate_checks insert: ${insertedChecks.error.message}`);
  }

  fs.writeFileSync(
    SUMMARY_PATH,
    JSON.stringify(
      {
        ai_release_gate_run_id: releaseGateRunId,
        ...summary,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  writeCsv(
    CHECKS_CSV_PATH,
    checks.map((check) => ({
      check_key: check.check_key,
      severity: check.severity,
      passed: check.passed,
      actual_value: check.actual_value,
      expected_value: check.expected_value,
      details: check.details,
    }))
  );

  console.log(
    JSON.stringify(
      {
        ai_release_gate_run_id: releaseGateRunId,
        gate_status: gateStatus,
        ai_delivery_run_id: aiDeliveryRunId,
        ai_delivery_quality_run_id: qualityRunId,
        ai_semantic_validation_run_id: semanticRunId,
        checks_total: checks.length,
        checks_failed: checks.filter((check) => !check.passed).length,
        checks_failed_error: checks.filter((check) => check.severity === 'ERROR' && !check.passed).length,
        checks_failed_warn: checks.filter((check) => check.severity === 'WARN' && !check.passed).length,
        exports: {
          summary_json: SUMMARY_PATH,
          gate_checks_csv: CHECKS_CSV_PATH,
        },
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AI_RELEASE_GATE_ERROR: ${message}`);
  process.exit(1);
});
