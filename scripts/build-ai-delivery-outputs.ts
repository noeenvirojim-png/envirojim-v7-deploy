import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

type DbRow = Record<string, unknown>;

type SourceEntity = {
  id: string;
  kb_id: string;
  entity_type: string | null;
  canonical_name: string | null;
  source_page: string | null;
  evidence_snippet: string | null;
};

type DeliveryKind = 'maintenance' | 'checklist' | 'diagnostic';
type DeliveryStatus = 'ready' | 'needs_review';

type DeliveryItem = {
  kb_id: string;
  entity_id: string;
  delivery_kind: DeliveryKind;
  title: string;
  entity_type: string | null;
  source_page: string | null;
  evidence_snippet: string | null;
  status: DeliveryStatus;
  review_reason: string | null;
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
  throw new Error(
    'Missing Supabase env. Expected SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or fallback key).',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

function norm(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function inferDeliveryKind(entityType: string | null, canonicalName: string | null): DeliveryKind | null {
  const t = norm(entityType);
  const n = norm(canonicalName);

  if (
    hasAny(t, ['fault', 'diagnostic', 'troubleshoot', 'error', 'alarm', 'failure']) ||
    hasAny(n, ['fault', 'diagnostic', 'troubleshoot', 'error', 'alarm', 'failure'])
  ) {
    return 'diagnostic';
  }

  if (
    hasAny(t, ['checklist']) ||
    hasAny(n, [
      'checklist',
      'pre-start',
      'pre start',
      'startup',
      'start-up',
      'shutdown',
      'safety check',
      'daily check',
      'weekly check',
      'inspection checklist',
    ])
  ) {
    return 'checklist';
  }

  if (
    hasAny(t, ['procedure', 'maintenance', 'service', 'inspection', 'lubrication', 'interval']) ||
    hasAny(n, ['maintenance', 'service', 'inspect', 'inspection', 'lubricat', 'grease', 'replace', 'change', 'adjust', 'clean'])
  ) {
    return 'maintenance';
  }

  return null;
}

function inferStatus(row: SourceEntity): { status: DeliveryStatus; review_reason: string | null } {
  const reasons: string[] = [];

  if (!row.canonical_name || !row.canonical_name.trim()) {
    reasons.push('missing_canonical_name');
  }

  if (!row.evidence_snippet || !row.evidence_snippet.trim()) {
    reasons.push('missing_snippet');
  }

  if (!row.source_page || !String(row.source_page).trim()) {
    reasons.push('missing_source_page');
  }

  if (reasons.length === 0) {
    return { status: 'ready', review_reason: null };
  }

  return {
    status: 'needs_review',
    review_reason: reasons.join('|'),
  };
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

async function findKbId(): Promise<string> {
  const { data, error } = await supabase
    .from('machine_kb_entities')
    .select('kb_id')
    .not('kb_id', 'is', null)
    .limit(5000);

  if (error) {
    throw new Error(`Failed to read machine_kb_entities.kb_id: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const kbId = String((row as DbRow).kb_id || '');
    if (!kbId) continue;
    counts.set(kbId, (counts.get(kbId) || 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    throw new Error('No real kb_id found in machine_kb_entities.');
  }

  return sorted[0][0];
}

async function readSourceEntities(kbId: string): Promise<SourceEntity[]> {
  const { data, error } = await supabase
    .from('machine_kb_entities')
    .select(
      `
      id,
      kb_id,
      entity_type,
      canonical_name,
      machine_kb_evidence(source_page, evidence_snippet)
    `
    )
    .eq('kb_id', kbId)
    .limit(10000);

  if (error) {
    throw new Error(`Failed to fetch source entities: ${error.message}`);
  }

  const rows = (data || []) as any[];

  return rows.map((row) => {
    const evidenceList = Array.isArray(row.machine_kb_evidence) ? row.machine_kb_evidence : [];
    const bestEvidence = evidenceList.length > 0 ? evidenceList[0] : null;

    return {
      id: String(row.id || ''),
      kb_id: String(row.kb_id || ''),
      entity_type: row.entity_type ? String(row.entity_type) : null,
      canonical_name: row.canonical_name ? String(row.canonical_name) : null,
      source_page: bestEvidence?.source_page ? String(bestEvidence.source_page) : null,
      evidence_snippet: bestEvidence?.evidence_snippet ? String(bestEvidence.evidence_snippet) : null,
    };
  });
}

function buildItems(rows: SourceEntity[]): DeliveryItem[] {
  const items: DeliveryItem[] = [];

  for (const row of rows) {
    const kind = inferDeliveryKind(row.entity_type, row.canonical_name);
    if (!kind) continue;

    const review = inferStatus(row);

    items.push({
      kb_id: row.kb_id,
      entity_id: row.id,
      delivery_kind: kind,
      title: row.canonical_name?.trim() || '[MISSING TITLE]',
      entity_type: row.entity_type,
      source_page: row.source_page,
      evidence_snippet: row.evidence_snippet,
      status: review.status,
      review_reason: review.review_reason,
    });
  }

  return items;
}

async function insertRun(kbId: string, items: DeliveryItem[]) {
  const summary = {
    selected_from_real_kb: true,
    classification_based_on: ['entity_type', 'canonical_name', 'source_page', 'evidence_snippet'],
    ignored_entities_without_supported_kind: true,
  };

  const maintenanceCount = items.filter((i) => i.delivery_kind === 'maintenance').length;
  const checklistCount = items.filter((i) => i.delivery_kind === 'checklist').length;
  const diagnosticCount = items.filter((i) => i.delivery_kind === 'diagnostic').length;
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const needsReviewCount = items.filter((i) => i.status === 'needs_review').length;

  const { data, error } = await supabase
    .from('ai_delivery_runs')
    .insert({
      kb_id: kbId,
      status: 'created',
      total_items: items.length,
      ready_items: readyCount,
      needs_review_items: needsReviewCount,
      maintenance_items: maintenanceCount,
      checklist_items: checklistCount,
      diagnostic_items: diagnosticCount,
      notes: summary,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create ai_delivery_runs row: ${error?.message || 'missing run id'}`);
  }

  return String(data.id);
}

async function insertItems(runId: string, items: DeliveryItem[]): Promise<void> {
  if (items.length === 0) return;

  const payload = items.map((item) => ({
    run_id: runId,
    kb_id: item.kb_id,
    entity_id: item.entity_id,
    delivery_kind: item.delivery_kind,
    title: item.title,
    entity_type: item.entity_type,
    source_page: item.source_page,
    evidence_snippet: item.evidence_snippet,
    status: item.status,
    review_reason: item.review_reason,
  }));

  const { error } = await supabase.from('ai_delivery_items').insert(payload);
  if (error) {
    throw new Error(`Failed to insert ai_delivery_items rows: ${error.message}`);
  }
}

async function completeRun(runId: string): Promise<void> {
  const { error } = await supabase
    .from('ai_delivery_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) {
    throw new Error(`Failed to finalize ai_delivery_runs row: ${error.message}`);
  }
}

async function exportArtifacts(runId: string) {
  const { data, error } = await supabase
    .from('ai_delivery_items')
    .select('delivery_kind,title,entity_type,source_page,evidence_snippet,status,review_reason,entity_id,kb_id')
    .eq('run_id', runId)
    .order('delivery_kind')
    .order('title');

  if (error) {
    throw new Error(`Failed to read ai_delivery_items for export: ${error.message}`);
  }

  const rows = (data || []) as DbRow[];
  const maintenance = rows.filter((r) => r.delivery_kind === 'maintenance');
  const checklist = rows.filter((r) => r.delivery_kind === 'checklist');
  const diagnostic = rows.filter((r) => r.delivery_kind === 'diagnostic');

  const outDir = 'artifacts/ai-delivery';
  await mkdir(outDir, { recursive: true });

  const headers = [
    'title',
    'entity_type',
    'source_page',
    'evidence_snippet',
    'status',
    'review_reason',
    'entity_id',
    'kb_id',
  ];

  await writeFile(`${outDir}/maintenance_items.csv`, toCsv(maintenance, headers), 'utf8');
  await writeFile(`${outDir}/checklist_items.csv`, toCsv(checklist, headers), 'utf8');
  await writeFile(`${outDir}/diagnostic_cases.csv`, toCsv(diagnostic, headers), 'utf8');

  const summary = {
    run_id: runId,
    total_items: rows.length,
    maintenance_items_count: maintenance.length,
    maintenance_needs_review_count: maintenance.filter((r) => r.status === 'needs_review').length,
    checklist_items_count: checklist.length,
    checklist_needs_review_count: checklist.filter((r) => r.status === 'needs_review').length,
    diagnostic_cases_count: diagnostic.length,
    diagnostic_needs_review_count: diagnostic.filter((r) => r.status === 'needs_review').length,
    useful_item_1: maintenance[0]?.title || null,
    useful_item_2: checklist[0]?.title || null,
    useful_item_3: diagnostic[0]?.title || null,
  };

  await writeFile(`${outDir}/summary.json`, JSON.stringify(summary, null, 2), 'utf8');

  return summary;
}

async function main() {
  const kbId = process.argv[2] || (await findKbId());
  const sourceRows = await readSourceEntities(kbId);

  if (sourceRows.length === 0) {
    throw new Error(`No source entities found for kb_id=${kbId}`);
  }

  const items = buildItems(sourceRows);
  const runId = await insertRun(kbId, items);
  await insertItems(runId, items);
  await completeRun(runId);
  const summary = await exportArtifacts(runId);

  console.log(
    JSON.stringify(
      {
        ok: true,
        kb_id: kbId,
        run_id: runId,
        source_entities_scanned: sourceRows.length,
        ...summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
