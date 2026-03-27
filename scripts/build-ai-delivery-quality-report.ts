import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

type DbRow = Record<string, unknown>;

type QualityIssue = 'EMPTY_TITLE' | 'TOO_VAGUE' | 'DUPLICATE' | 'NO_SOURCE_ANCHOR' | 'LOW_INFORMATION_VALUE' | 'OK';

type QualityItem = {
  entity_id: string;
  title: string;
  delivery_kind: string;
  entity_type: string | null;
  source_page: string | null;
  evidence_snippet: string | null;
  status: string;
  quality_verdict: 'KEEP' | 'NEEDS_REVIEW' | 'REJECT';
  quality_reason: QualityIssue;
  quality_notes: string;
};

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function norm(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function assessQuality(item: DbRow): { verdict: 'KEEP' | 'NEEDS_REVIEW' | 'REJECT'; reason: QualityIssue; notes: string } {
  const title = norm(item.title);
  const snippet = norm(item.evidence_snippet);
  const page = norm(item.source_page);

  if (!title || title.length === 0) {
    return { verdict: 'REJECT', reason: 'EMPTY_TITLE', notes: 'Title is empty' };
  }

  if (title.length < 5) {
    return { verdict: 'NEEDS_REVIEW', reason: 'TOO_VAGUE', notes: `Title too short (${title.length} chars)` };
  }

  if (title === '[missing title]') {
    return { verdict: 'REJECT', reason: 'EMPTY_TITLE', notes: 'Title is placeholder' };
  }

  if (!snippet || snippet.length < 20) {
    return { verdict: 'NEEDS_REVIEW', reason: 'LOW_INFORMATION_VALUE', notes: 'Evidence snippet missing or too short' };
  }

  if (!page || page.length === 0) {
    return { verdict: 'NEEDS_REVIEW', reason: 'NO_SOURCE_ANCHOR', notes: 'No source page anchor' };
  }

  const vagueness = [
    'unknown',
    'item',
    'thing',
    'data',
    'information',
    'entity',
    'element',
  ];
  if (vagueness.some((v) => title.includes(v))) {
    return { verdict: 'NEEDS_REVIEW', reason: 'TOO_VAGUE', notes: 'Title contains vague term' };
  }

  return { verdict: 'KEEP', reason: 'OK', notes: 'Quality acceptable' };
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: DbRow[], headers: string[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

async function getLatestRun(): Promise<string> {
  const { data, error } = await supabase
    .from('ai_delivery_runs')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to get latest run: ${error?.message || 'no run found'}`);
  }

  return String(data.id);
}

async function readItems(runId: string): Promise<DbRow[]> {
  const { data, error } = await supabase
    .from('ai_delivery_items')
    .select('*')
    .eq('run_id', runId)
    .order('delivery_kind')
    .order('title');

  if (error) {
    throw new Error(`Failed to read items: ${error.message}`);
  }

  return (data || []) as DbRow[];
}

async function main() {
  const runId = await getLatestRun();
  const items = await readItems(runId);

  const maintenanceItems = items.filter((i) => i.delivery_kind === 'maintenance');
  const diagnosticItems = items.filter((i) => i.delivery_kind === 'diagnostic');

  const qualityReview: QualityItem[] = [];
  const seenTitles = new Set<string>();
  const duplicates = new Map<string, number>();

  for (const item of items) {
    const normalized = norm(item.title);
    if (duplicates.has(normalized)) {
      duplicates.set(normalized, (duplicates.get(normalized) || 0) + 1);
    } else {
      duplicates.set(normalized, 1);
    }
  }

  for (const item of items) {
    const normalized = norm(item.title);
    const isDuplicate = duplicates.get(normalized)! > 1;

    const { verdict, reason, notes } = assessQuality(item);

    let finalVerdict = verdict;
    let finalReason = reason;
    let finalNotes = notes;

    if (isDuplicate) {
      finalVerdict = 'NEEDS_REVIEW';
      finalReason = 'DUPLICATE';
      finalNotes = `Duplicate title (${duplicates.get(normalized)} total)`;
    }

    qualityReview.push({
      entity_id: String(item.entity_id || ''),
      title: String(item.title || ''),
      delivery_kind: String(item.delivery_kind || ''),
      entity_type: item.entity_type ? String(item.entity_type) : null,
      source_page: item.source_page ? String(item.source_page) : null,
      evidence_snippet: item.evidence_snippet ? String(item.evidence_snippet).substring(0, 100) : null,
      status: String(item.status || ''),
      quality_verdict: finalVerdict,
      quality_reason: finalReason,
      quality_notes: finalNotes,
    });
  }

  const maintenanceQuality = qualityReview.filter((q) => q.delivery_kind === 'maintenance');
  const diagnosticQuality = qualityReview.filter((q) => q.delivery_kind === 'diagnostic');

  const maintenanceKeep = maintenanceQuality.filter((q) => q.quality_verdict === 'KEEP').length;
  const maintenanceNeedsReview = maintenanceQuality.filter((q) => q.quality_verdict === 'NEEDS_REVIEW').length;
  const maintenanceReject = maintenanceQuality.filter((q) => q.quality_verdict === 'REJECT').length;

  const diagnosticKeep = diagnosticQuality.filter((q) => q.quality_verdict === 'KEEP').length;
  const diagnosticNeedsReview = diagnosticQuality.filter((q) => q.quality_verdict === 'NEEDS_REVIEW').length;
  const diagnosticReject = diagnosticQuality.filter((q) => q.quality_verdict === 'REJECT').length;

  const majorIssues: string[] = [];

  const totalRejects = maintenanceReject + diagnosticReject;
  if (totalRejects > 0) {
    majorIssues.push(`${totalRejects} items rejected due to empty/invalid data`);
  }

  const duplicateCount = Array.from(duplicates.values()).filter((c) => c > 1).length;
  if (duplicateCount > 0) {
    majorIssues.push(`${duplicateCount} duplicate titles detected`);
  }

  const lowInfoCount = qualityReview.filter((q) => q.quality_reason === 'LOW_INFORMATION_VALUE').length;
  if (lowInfoCount > maintenanceQuality.length * 0.1) {
    majorIssues.push(`${lowInfoCount} items have insufficient evidence/snippet`);
  }

  const outDir = 'artifacts/ai-delivery-quality';
  await mkdir(outDir, { recursive: true });

  const maintenanceHeaders = [
    'entity_id',
    'title',
    'entity_type',
    'source_page',
    'evidence_snippet',
    'status',
    'quality_verdict',
    'quality_reason',
    'quality_notes',
  ];

  const diagnosticHeaders = [
    'entity_id',
    'title',
    'entity_type',
    'source_page',
    'evidence_snippet',
    'status',
    'quality_verdict',
    'quality_reason',
    'quality_notes',
  ];

  await writeFile(
    `${outDir}/maintenance_quality_review.csv`,
    toCsv(
      maintenanceQuality.map((q) => ({
        entity_id: q.entity_id,
        title: q.title,
        entity_type: q.entity_type,
        source_page: q.source_page,
        evidence_snippet: q.evidence_snippet,
        status: q.status,
        quality_verdict: q.quality_verdict,
        quality_reason: q.quality_reason,
        quality_notes: q.quality_notes,
      })),
      maintenanceHeaders
    ),
    'utf8'
  );

  await writeFile(
    `${outDir}/diagnostic_quality_review.csv`,
    toCsv(
      diagnosticQuality.map((q) => ({
        entity_id: q.entity_id,
        title: q.title,
        entity_type: q.entity_type,
        source_page: q.source_page,
        evidence_snippet: q.evidence_snippet,
        status: q.status,
        quality_verdict: q.quality_verdict,
        quality_reason: q.quality_reason,
        quality_notes: q.quality_notes,
      })),
      diagnosticHeaders
    ),
    'utf8'
  );

  const summary = {
    run_id: runId,
    total_items: qualityReview.length,
    maintenance_total: maintenanceQuality.length,
    maintenance_keep: maintenanceKeep,
    maintenance_needs_review: maintenanceNeedsReview,
    maintenance_reject: maintenanceReject,
    diagnostic_total: diagnosticQuality.length,
    diagnostic_keep: diagnosticKeep,
    diagnostic_needs_review: diagnosticNeedsReview,
    diagnostic_reject: diagnosticReject,
    keep_percentage: Math.round(((maintenanceKeep + diagnosticKeep) / qualityReview.length) * 100),
    needs_review_percentage: Math.round(((maintenanceNeedsReview + diagnosticNeedsReview) / qualityReview.length) * 100),
    reject_percentage: Math.round(((maintenanceReject + diagnosticReject) / qualityReview.length) * 100),
    duplicate_titles_detected: duplicateCount,
    major_issues: majorIssues,
    useful_maintenance_item_1: maintenanceQuality.find((q) => q.quality_verdict === 'KEEP')?.title || null,
    useful_diagnostic_case_1: diagnosticQuality.find((q) => q.quality_verdict === 'KEEP')?.title || null,
  };

  await writeFile(`${outDir}/summary.json`, JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exit(1);
});
