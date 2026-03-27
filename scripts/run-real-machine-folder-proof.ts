#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

type PreflightRow = {
  file_name: string;
  absolute_path: string;
  file_size_bytes: number;
  page_count: number | null;
  extracted_text_chars_preflight: number | null;
  likely_scan_or_image_heavy: 'YES' | 'NO' | 'UNKNOWN';
  risk_class: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_reason: string;
};

type IngestionRow = {
  file_name: string;
  absolute_path: string;
  ingestion_status: 'PASS' | 'FAIL';
  error_message: string;
  document_id: string | null;
  kb_id: string | null;
  chunks_count: number | null;
  entities_count: number | null;
  evidence_count: number | null;
};

type RootCause = {
  blocker_type: 'NONE' | 'EXTRACTION' | 'PARSER' | 'INVOCATION' | 'PIPELINE' | 'OTHER';
  exact_reason: string;
  scope: 'ISOLATED' | 'REPEATED' | 'STRUCTURAL';
};

const ROOT_DIR = process.cwd();
const ARTIFACT_DIR = path.resolve(ROOT_DIR, 'artifacts/real-machine-proof');
const PREFLIGHT_PATH = path.join(ARTIFACT_DIR, 'preflight_manifest.csv');
const INGESTION_PATH = path.join(ARTIFACT_DIR, 'ingestion_manifest.csv');
const SUMMARY_PATH = path.join(ARTIFACT_DIR, 'summary.json');

const DEFAULT_FOLDER_PATH =
  process.env.FOLDER_PATH ||
  'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';

const BOOTSTRAP_ENTRY = path.join('scripts', 'run-ts-entry.cjs');
const INGEST_ENTRY = path.join('scripts', 'ingest-pdf-local.ts');

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>, headers: string[]): void {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function listPdfFilesRecursive(startDir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        results.push(fullPath);
      }
    }
  }

  walk(startDir);
  return results.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

async function tryPdfParse(filePath: string): Promise<{ pageCount: number | null; textChars: number | null; parseError: string | null }> {
  try {
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default ?? pdfParseModule;
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    const pageCount = typeof parsed?.numpages === 'number' ? parsed.numpages : null;
    const textChars = typeof parsed?.text === 'string' ? parsed.text.length : null;
    return { pageCount, textChars, parseError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { pageCount: null, textChars: null, parseError: message };
  }
}

function computePreflightRisk(
  fileSizeBytes: number,
  pageCount: number | null,
  textChars: number | null,
  parseError: string | null
): Pick<PreflightRow, 'likely_scan_or_image_heavy' | 'risk_class' | 'risk_reason'> {
  const sizeMb = fileSizeBytes / (1024 * 1024);

  if (parseError) {
    return {
      likely_scan_or_image_heavy: 'UNKNOWN',
      risk_class: 'HIGH',
      risk_reason: `preflight_parse_error:${parseError.slice(0, 120)}`,
    };
  }

  if (pageCount !== null && textChars !== null) {
    const veryLowTextThreshold = Math.max(120, pageCount * 40);
    const lowTextThreshold = Math.max(600, pageCount * 180);

    if (textChars <= veryLowTextThreshold) {
      return {
        likely_scan_or_image_heavy: 'YES',
        risk_class: 'HIGH',
        risk_reason: 'very_low_text_density',
      };
    }

    if (textChars <= lowTextThreshold) {
      return {
        likely_scan_or_image_heavy: 'YES',
        risk_class: 'MEDIUM',
        risk_reason: 'low_text_density',
      };
    }

    if (pageCount >= 300 || sizeMb >= 40) {
      return {
        likely_scan_or_image_heavy: 'NO',
        risk_class: 'HIGH',
        risk_reason: pageCount >= 300 ? 'very_high_page_count' : 'very_large_pdf',
      };
    }

    if (pageCount >= 150 || sizeMb >= 20) {
      return {
        likely_scan_or_image_heavy: 'NO',
        risk_class: 'MEDIUM',
        risk_reason: pageCount >= 150 ? 'high_page_count' : 'large_pdf',
      };
    }

    return {
      likely_scan_or_image_heavy: 'NO',
      risk_class: 'LOW',
      risk_reason: 'normal_text_pdf',
    };
  }

  if (sizeMb >= 40) {
    return {
      likely_scan_or_image_heavy: 'UNKNOWN',
      risk_class: 'HIGH',
      risk_reason: 'very_large_pdf_no_text_parse',
    };
  }

  if (sizeMb >= 20) {
    return {
      likely_scan_or_image_heavy: 'UNKNOWN',
      risk_class: 'MEDIUM',
      risk_reason: 'large_pdf_no_text_parse',
    };
  }

  return {
    likely_scan_or_image_heavy: 'UNKNOWN',
    risk_class: 'MEDIUM',
    risk_reason: 'preflight_partial_metadata_only',
  };
}

function tailCombinedOutput(stdout: string, stderr: string): string {
  const combined = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  if (!combined) return '';
  return combined.slice(-2000);
}

function extractUuidByKey(text: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedKey}\\s*[:=]\\s*([0-9a-fA-F-]{36})`, 'i');
  const match = text.match(regex);
  return match?.[1] ?? null;
}

function runTsEntry(entryPath: string, args: string[] = [], extraEnv: Record<string, string> = {}) {
  const bootstrapPath = path.resolve(ROOT_DIR, BOOTSTRAP_ENTRY);
  const result = spawnSync(process.execPath, [bootstrapPath, entryPath, ...args], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    combined: tailCombinedOutput(result.stdout ?? '', result.stderr ?? ''),
  };
}

async function main(): Promise<void> {
  ensureDir(ARTIFACT_DIR);

  const folderPath = process.env.FOLDER_PATH || DEFAULT_FOLDER_PATH;

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  if (!fs.existsSync(path.resolve(ROOT_DIR, BOOTSTRAP_ENTRY))) {
    throw new Error(`Missing bootstrap entry: ${BOOTSTRAP_ENTRY}`);
  }

  if (!fs.existsSync(path.resolve(ROOT_DIR, INGEST_ENTRY))) {
    throw new Error(`Missing ingest entry: ${INGEST_ENTRY}`);
  }

  const pdfFiles = listPdfFilesRecursive(folderPath);

  const preflightRows: PreflightRow[] = [];
  for (const pdfPath of pdfFiles) {
    const stat = fs.statSync(pdfPath);
    const parsed = await tryPdfParse(pdfPath);
    const risk = computePreflightRisk(stat.size, parsed.pageCount, parsed.textChars, parsed.parseError);

    preflightRows.push({
      file_name: path.basename(pdfPath),
      absolute_path: pdfPath,
      file_size_bytes: stat.size,
      page_count: parsed.pageCount,
      extracted_text_chars_preflight: parsed.textChars,
      likely_scan_or_image_heavy: risk.likely_scan_or_image_heavy,
      risk_class: risk.risk_class,
      risk_reason: risk.risk_reason,
    });
  }

  writeCsv(
    PREFLIGHT_PATH,
    preflightRows,
    [
      'file_name',
      'absolute_path',
      'file_size_bytes',
      'page_count',
      'extracted_text_chars_preflight',
      'likely_scan_or_image_heavy',
      'risk_class',
      'risk_reason',
    ]
  );

  const ingestionRows: IngestionRow[] = [];
  for (const pdfPath of pdfFiles) {
    const fileName = path.basename(pdfPath);
    const result = runTsEntry(INGEST_ENTRY, [fileName], { FOLDER_PATH: folderPath });

    const combined = result.combined;
    const ingestionStatus: 'PASS' | 'FAIL' = result.status === 0 ? 'PASS' : 'FAIL';

    ingestionRows.push({
      file_name: fileName,
      absolute_path: pdfPath,
      ingestion_status: ingestionStatus,
      error_message: ingestionStatus === 'FAIL' ? combined || 'ingestion_failed_without_output' : '',
      document_id: extractUuidByKey(combined, 'document_id') ?? extractUuidByKey(combined, 'machine_document_id'),
      kb_id: extractUuidByKey(combined, 'kb_id') ?? extractUuidByKey(combined, 'machine_kb_id'),
      chunks_count: null,
      entities_count: null,
      evidence_count: null,
    });
  }

  writeCsv(
    INGESTION_PATH,
    ingestionRows,
    [
      'file_name',
      'absolute_path',
      'ingestion_status',
      'error_message',
      'document_id',
      'kb_id',
      'chunks_count',
      'entities_count',
      'evidence_count',
    ]
  );

  const pdfIngestedSuccessCount = ingestionRows.filter((row) => row.ingestion_status === 'PASS').length;
  const pdfIngestedFailCount = ingestionRows.length - pdfIngestedSuccessCount;
  const realIngestionProven = pdfIngestedSuccessCount > 0;

  const failRows = ingestionRows.filter((row) => row.ingestion_status === 'FAIL');
  const distinctMessages = Array.from(new Set(failRows.map((row) => row.error_message).filter(Boolean)));
  const firstMessage = distinctMessages[0] ?? 'none';

  let rootCause: RootCause = {
    blocker_type: 'NONE',
    exact_reason: 'none',
    scope: 'ISOLATED',
  };

  if (!realIngestionProven) {
    const messageLower = firstMessage.toLowerCase();
    if (messageLower.includes('cannot find module') || messageLower.includes('@/') || messageLower.includes('tsconfig-paths')) {
      rootCause = {
        blocker_type: 'INVOCATION',
        exact_reason: firstMessage,
        scope: distinctMessages.length === 1 ? 'STRUCTURAL' : 'REPEATED',
      };
    } else if (messageLower.includes('pdf') || messageLower.includes('parse') || messageLower.includes('invalid')) {
      rootCause = {
        blocker_type: 'PARSER',
        exact_reason: firstMessage,
        scope: distinctMessages.length === 1 ? 'REPEATED' : 'ISOLATED',
      };
    } else {
      rootCause = {
        blocker_type: 'OTHER',
        exact_reason: firstMessage,
        scope: distinctMessages.length === 1 ? 'REPEATED' : 'ISOLATED',
      };
    }
  }

  const summary = {
    folder_path: folderPath,
    pdf_total: pdfFiles.length,
    preflight_high_risk_count: preflightRows.filter((row) => row.risk_class === 'HIGH').length,
    pdf_ingested_success_count: pdfIngestedSuccessCount,
    pdf_ingested_fail_count: pdfIngestedFailCount,
    real_ingestion_proven: realIngestionProven,
    ai_delivery_run_id: null,
    ai_delivery_quality_run_id: null,
    ai_semantic_validation_run_id: null,
    ai_release_gate_run_id: null,
    release_gate_status: null,
    maintenance_total: null,
    maintenance_keep_count: null,
    maintenance_needs_review_count: null,
    maintenance_reject_count: null,
    diagnostic_total: null,
    diagnostic_keep_count: null,
    diagnostic_needs_review_count: null,
    diagnostic_reject_count: null,
    root_cause_assessment: rootCause,
  };

  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        folder_path: folderPath,
        pdf_total: pdfFiles.length,
        preflight_high_risk_count: summary.preflight_high_risk_count,
        pdf_ingested_success_count: pdfIngestedSuccessCount,
        pdf_ingested_fail_count: pdfIngestedFailCount,
        real_ingestion_proven: realIngestionProven ? 'YES' : 'NO',
        exports: {
          preflight_manifest_csv: PREFLIGHT_PATH,
          ingestion_manifest_csv: INGESTION_PATH,
          summary_json: SUMMARY_PATH,
        },
        root_cause_assessment: rootCause,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`REAL_MACHINE_FOLDER_PROOF_ERROR: ${message}`);
  process.exit(1);
});
