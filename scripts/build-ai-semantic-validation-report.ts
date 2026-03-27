import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

type RunContext = {
  aiDeliveryRunId: string;
  machineId: string | null;
  kbId: string | null;
};

type EntityRow = {
  id: string;
  canonical_name: string | null;
  entity_type: string | null;
};

type EvidenceRow = {
  entity_id: string;
  source_page: number | null;
  evidence_snippet: string | null;
};

type ReviewRow = {
  itemKind: 'maintenance' | 'diagnostic';
  sourceTable: string;
  sourceRowId: string | null;
  sourceEntityId: string | null;
  title: string;
  normalizedTitle: string;
  entityType: string | null;
  evidencePage: number | null;
  evidenceSnippet: string | null;
  anchorStrength: 'DIRECT' | 'ENTITY_EVIDENCE' | 'KB_NAME_MATCH' | 'NONE';
  semanticStatus: 'KEEP' | 'NEEDS_REVIEW' | 'REJECT';
  semanticReason: string;
  reviewPayload: Record<string, unknown>;
};

type Summary = {
  ai_delivery_run_id: string;
  machine_id: string | null;
  kb_id: string | null;
  maintenance_total: number;
  maintenance_keep_count: number;
  maintenance_needs_review_count: number;
  maintenance_reject_count: number;
  diagnostic_total: number;
  diagnostic_keep_count: number;
  diagnostic_needs_review_count: number;
  diagnostic_reject_count: number;
  evidence_attached_total: number;
  weak_anchor_total: number;
  exported_at: string;
};

const TABLE_RUNS = 'ai_delivery_runs';
const TABLE_ITEMS = 'ai_delivery_items';
const OUT_DIR = path.join(process.cwd(), 'artifacts', 'ai-semantic-validation');

const RUN_ID_KEYS = ['ai_delivery_run_id', 'run_id'];
const TITLE_KEYS = [
  'title',
  'name',
  'label',
  'canonical_name',
  'item_name',
  'maintenance_item',
  'diagnostic_case',
  'fault_name',
  'summary',
];
const ENTITY_ID_KEYS = [
  'entity_id',
  'kb_entity_id',
  'machine_kb_entity_id',
  'source_entity_id',
  'related_entity_id',
];
const PAGE_KEYS = ['source_page', 'page', 'evidence_page'];
const SNIPPET_KEYS = ['evidence_snippet', 'snippet', 'source_snippet', 'evidence', 'excerpt'];
const MACHINE_ID_KEYS = ['machine_id'];
const KB_ID_KEYS = ['kb_id', 'machine_kb_id'];

const VAGUE_EXACT = new Set([
  'maintenance',
  'checklist',
  'inspection',
  'task',
  'diagnostic',
  'fault',
  'problem',
  'issue',
  'procedure',
  'system',
]);

function requireEnv(nameCandidates: string[]): string {
  for (const name of nameCandidates) {
    const value = process.env[name];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  throw new Error(`Missing required environment variable. Tried: ${nameCandidates.join(', ')}`);
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeText(value: string | null): string {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function firstString(row: Row, keys: string[]): string | null {
  for (const key of keys) {
    if (key in row) {
      const value = asString(row[key]);
      if (value) {
        return value;
      }
    }
  }

  return null;
}

function firstNumber(row: Row, keys: string[]): number | null {
  for (const key of keys) {
    if (key in row) {
      const value = asNumber(row[key]);
      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function truncate(value: string | null, max = 400): string | null {
  if (!value) {
    return null;
  }

  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function csvEscape(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.map((header) => csvEscape(header)).join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

async function fetchRowsWithPagination(
  supabase: SupabaseClient,
  table: string,
  runKey: string,
  runId: string,
): Promise<Row[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: Row[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(runKey, runId)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`${table} fetch failed: ${error.message}`);
    }

    const batch = (data ?? []) as Row[];
    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

async function detectLatestRun(supabase: SupabaseClient): Promise<RunContext> {
  const explicitRunId = asString(process.env.AI_DELIVERY_RUN_ID) ?? null;
  const explicitMachineId = asString(process.env.AI_DELIVERY_MACHINE_ID) ?? null;
  const explicitKbId = asString(process.env.AI_DELIVERY_KB_ID) ?? null;

  if (explicitRunId) {
    const { data } = await supabase
      .from(TABLE_RUNS)
      .select('*')
      .eq('id', explicitRunId)
      .limit(1)
      .maybeSingle();

    const row = (data ?? {}) as Row;

    return {
      aiDeliveryRunId: explicitRunId,
      machineId: firstString(row, MACHINE_ID_KEYS) ?? explicitMachineId,
      kbId: firstString(row, KB_ID_KEYS) ?? explicitKbId,
    };
  }

  const { data, error } = await supabase
    .from(TABLE_RUNS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    const row = data as Row;
    const runId = asString(row.id) ?? firstString(row, RUN_ID_KEYS);

    if (!runId) {
      throw new Error('Latest ai_delivery_runs row has no usable id.');
    }

    return {
      aiDeliveryRunId: runId,
      machineId: firstString(row, MACHINE_ID_KEYS),
      kbId: firstString(row, KB_ID_KEYS),
    };
  }

  const probe = await supabase.from(TABLE_ITEMS).select('*').order('created_at', { ascending: false }).limit(5);
  if (probe.error) {
    throw new Error(`Unable to detect ai_delivery_run_id. ${probe.error.message}`);
  }

  const first = ((probe.data ?? [])[0] ?? null) as Row | null;
  if (!first) {
    throw new Error('Unable to detect ai_delivery_run_id. No ai_delivery_items rows found.');
  }

  const runId = firstString(first, RUN_ID_KEYS);
  if (!runId) {
    throw new Error('Unable to detect ai_delivery_run_id from maintenance_items.');
  }

  return {
    aiDeliveryRunId: runId,
    machineId: explicitMachineId,
    kbId: explicitKbId,
  };
}

function detectRunKey(rows: Row[]): string {
  const sample = rows.find(Boolean) ?? {};
  for (const key of RUN_ID_KEYS) {
    if (key in sample) {
      return key;
    }
  }

  return 'ai_delivery_run_id';
}

async function fetchTableRows(supabase: SupabaseClient, table: string, runId: string, deliveryKind?: string): Promise<Row[]> {
  const pageSize = 1000;
  let from = 0;
  const allRows: Row[] = [];

  while (true) {
    let query = supabase
      .from(table)
      .select('*')
      .eq('run_id', runId);

    if (deliveryKind) {
      query = query.eq('delivery_kind', deliveryKind);
    }

    const { data, error } = await query.range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`${table} fetch failed: ${error.message}`);
    }

    const batch = (data ?? []) as Row[];
    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

async function fetchKbEntities(supabase: SupabaseClient, kbId: string | null): Promise<EntityRow[]> {
  if (!kbId) {
    return [];
  }

  const { data, error } = await supabase
    .from('machine_kb_entities')
    .select('id, canonical_name, entity_type')
    .eq('kb_id', kbId);

  if (error) {
    throw new Error(`machine_kb_entities fetch failed: ${error.message}`);
  }

  return (data ?? []) as EntityRow[];
}

async function fetchEvidenceByEntityId(
  supabase: SupabaseClient,
  entityIds: string[],
): Promise<Map<string, EvidenceRow[]>> {
  const evidenceMap = new Map<string, EvidenceRow[]>();

  if (!entityIds.length) {
    return evidenceMap;
  }

  const chunkSize = 200;
  for (let index = 0; index < entityIds.length; index += chunkSize) {
    const chunk = entityIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from('machine_kb_evidence')
      .select('entity_id, source_page, evidence_snippet')
      .in('entity_id', chunk);

    if (error) {
      throw new Error(`machine_kb_evidence fetch failed: ${error.message}`);
    }

    for (const row of (data ?? []) as EvidenceRow[]) {
      const list = evidenceMap.get(row.entity_id) ?? [];
      list.push(row);
      evidenceMap.set(row.entity_id, list);
    }
  }

  return evidenceMap;
}

function buildEntityIndexes(entities: EntityRow[]) {
  const byId = new Map<string, EntityRow>();
  const byName = new Map<string, EntityRow[]>();

  for (const entity of entities) {
    byId.set(entity.id, entity);

    const normalized = normalizeText(entity.canonical_name);
    if (!normalized) {
      continue;
    }

    const list = byName.get(normalized) ?? [];
    list.push(entity);
    byName.set(normalized, list);
  }

  return { byId, byName };
}

function isTooVague(title: string, normalizedTitle: string): boolean {
  if (!title.trim()) {
    return true;
  }

  if (normalizedTitle.length < 5) {
    return true;
  }

  if (VAGUE_EXACT.has(normalizedTitle)) {
    return true;
  }

  const tokenCount = normalizedTitle.split(/\s+/).filter(Boolean).length;
  if (tokenCount === 1 && normalizedTitle.length < 5) {
    return true;
  }

  return false;
}

function buildReviewRows(
  itemKind: 'maintenance' | 'diagnostic',
  sourceTable: string,
  rows: Row[],
  entityById: Map<string, EntityRow>,
  entitiesByName: Map<string, EntityRow[]>,
  evidenceByEntityId: Map<string, EvidenceRow[]>,
): ReviewRow[] {
  const seenTitles = new Set<string>();
  const reviews: ReviewRow[] = [];

  for (const row of rows) {
    const sourceRowId = asString(row.id);
    const title = firstString(row, TITLE_KEYS) ?? '';
    const normalizedTitle = normalizeText(title);

    let sourceEntityId = firstString(row, ENTITY_ID_KEYS);
    let entityType: string | null = null;
    let evidencePage = firstNumber(row, PAGE_KEYS);
    let evidenceSnippet = truncate(firstString(row, SNIPPET_KEYS));
    let anchorStrength: ReviewRow['anchorStrength'] = 'NONE';

    if (evidencePage !== null || evidenceSnippet) {
      anchorStrength = 'DIRECT';
    }

    if (sourceEntityId && entityById.has(sourceEntityId)) {
      entityType = entityById.get(sourceEntityId)?.entity_type ?? null;
    }

    if ((!evidenceSnippet && evidencePage === null) && sourceEntityId && evidenceByEntityId.has(sourceEntityId)) {
      const evidence = evidenceByEntityId.get(sourceEntityId)?.[0] ?? null;
      if (evidence) {
        evidencePage = evidence.source_page ?? null;
        evidenceSnippet = truncate(evidence.evidence_snippet);
        anchorStrength = 'ENTITY_EVIDENCE';
      }
    }

    if (!sourceEntityId && normalizedTitle && entitiesByName.has(normalizedTitle)) {
      const entity = entitiesByName.get(normalizedTitle)?.[0] ?? null;
      if (entity) {
        sourceEntityId = entity.id;
        entityType = entity.entity_type ?? null;
        const evidence = evidenceByEntityId.get(entity.id)?.[0] ?? null;
        if (evidence) {
          evidencePage = evidence.source_page ?? null;
          evidenceSnippet = truncate(evidence.evidence_snippet);
          anchorStrength = 'KB_NAME_MATCH';
        }
      }
    }

    let semanticStatus: ReviewRow['semanticStatus'] = 'KEEP';
    let semanticReason = 'OK';

    if (!title.trim()) {
      semanticStatus = 'REJECT';
      semanticReason = 'EMPTY_TITLE';
    } else if (isTooVague(title, normalizedTitle)) {
      semanticStatus = 'NEEDS_REVIEW';
      semanticReason = 'TOO_VAGUE';
    } else if (normalizedTitle && seenTitles.has(normalizedTitle)) {
      semanticStatus = 'NEEDS_REVIEW';
      semanticReason = 'DUPLICATE_EXACT';
    } else if (anchorStrength === 'NONE') {
      semanticStatus = 'NEEDS_REVIEW';
      semanticReason = 'NO_SOURCE_ANCHOR';
    } else if ((evidenceSnippet ?? '').length > 0 && (evidenceSnippet ?? '').length <= 3) {
      semanticStatus = 'NEEDS_REVIEW';
      semanticReason = 'LOW_INFORMATION_VALUE';
    }

    if (normalizedTitle) {
      seenTitles.add(normalizedTitle);
    }

    reviews.push({
      itemKind,
      sourceTable,
      sourceRowId,
      sourceEntityId,
      title,
      normalizedTitle,
      entityType,
      evidencePage,
      evidenceSnippet,
      anchorStrength,
      semanticStatus,
      semanticReason,
      reviewPayload: {
        raw_keys: Object.keys(row).sort(),
        raw_has_direct_page: PAGE_KEYS.some((key) => key in row),
        raw_has_direct_snippet: SNIPPET_KEYS.some((key) => key in row),
      },
    });
  }

  return reviews;
}

function countByStatus(reviews: ReviewRow[]) {
  return {
    keep: reviews.filter((row) => row.semanticStatus === 'KEEP').length,
    needsReview: reviews.filter((row) => row.semanticStatus === 'NEEDS_REVIEW').length,
    reject: reviews.filter((row) => row.semanticStatus === 'REJECT').length,
  };
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function writeExports(
  summary: Summary,
  maintenanceReviews: ReviewRow[],
  diagnosticReviews: ReviewRow[],
): Promise<void> {
  await ensureDir(OUT_DIR);

  const serializeRows = (rows: ReviewRow[]) =>
    rows.map((row) => ({
      item_kind: row.itemKind,
      source_table: row.sourceTable,
      source_row_id: row.sourceRowId,
      source_entity_id: row.sourceEntityId,
      title: row.title,
      normalized_title: row.normalizedTitle,
      entity_type: row.entityType,
      evidence_page: row.evidencePage,
      evidence_snippet: row.evidenceSnippet,
      anchor_strength: row.anchorStrength,
      semantic_status: row.semanticStatus,
      semantic_reason: row.semanticReason,
    }));

  await fs.writeFile(
    path.join(OUT_DIR, 'maintenance_semantic_review.csv'),
    toCsv(serializeRows(maintenanceReviews)),
    'utf8',
  );

  await fs.writeFile(
    path.join(OUT_DIR, 'diagnostic_semantic_review.csv'),
    toCsv(serializeRows(diagnosticReviews)),
    'utf8',
  );

  await fs.writeFile(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );
}

async function persistResults(
  supabase: SupabaseClient,
  summary: Summary,
  maintenanceReviews: ReviewRow[],
  diagnosticReviews: ReviewRow[],
): Promise<string> {
  const { data: runData, error: runError } = await supabase
    .from('ai_semantic_validation_runs')
    .insert({
      ai_delivery_run_id: summary.ai_delivery_run_id,
      machine_id: summary.machine_id,
      kb_id: summary.kb_id,
      maintenance_total: summary.maintenance_total,
      diagnostic_total: summary.diagnostic_total,
      maintenance_keep_count: summary.maintenance_keep_count,
      maintenance_needs_review_count: summary.maintenance_needs_review_count,
      maintenance_reject_count: summary.maintenance_reject_count,
      diagnostic_keep_count: summary.diagnostic_keep_count,
      diagnostic_needs_review_count: summary.diagnostic_needs_review_count,
      diagnostic_reject_count: summary.diagnostic_reject_count,
      evidence_attached_total: summary.evidence_attached_total,
      weak_anchor_total: summary.weak_anchor_total,
      export_dir: 'artifacts/ai-semantic-validation',
      summary,
    })
    .select('id')
    .single();

  if (runError) {
    throw new Error(`ai_semantic_validation_runs insert failed: ${runError.message}`);
  }

  const validationRunId = asString(runData.id);
  if (!validationRunId) {
    throw new Error('ai_semantic_validation_runs insert returned no id.');
  }

  const allItems = [...maintenanceReviews, ...diagnosticReviews].map((row) => ({
    validation_run_id: validationRunId,
    item_kind: row.itemKind,
    source_table: row.sourceTable,
    source_row_id: row.sourceRowId,
    source_entity_id: row.sourceEntityId,
    title: row.title,
    normalized_title: row.normalizedTitle,
    entity_type: row.entityType,
    evidence_page: row.evidencePage,
    evidence_snippet: row.evidenceSnippet,
    anchor_strength: row.anchorStrength,
    semantic_status: row.semanticStatus,
    semantic_reason: row.semanticReason,
    review_payload: row.reviewPayload,
  }));

  const chunkSize = 500;
  for (let index = 0; index < allItems.length; index += chunkSize) {
    const chunk = allItems.slice(index, index + chunkSize);
    const { error } = await supabase.from('ai_semantic_validation_items').insert(chunk);
    if (error) {
      throw new Error(`ai_semantic_validation_items insert failed: ${error.message}`);
    }
  }

  return validationRunId;
}

async function main(): Promise<void> {
  const supabaseUrl = requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
  const supabaseKey = requireEnv(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY']);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runContext = await detectLatestRun(supabase);
  const maintenanceRows = await fetchTableRows(supabase, TABLE_ITEMS, runContext.aiDeliveryRunId, 'maintenance');
  const diagnosticRows = await fetchTableRows(supabase, TABLE_ITEMS, runContext.aiDeliveryRunId, 'diagnostic');

  const kbEntities = await fetchKbEntities(supabase, runContext.kbId);
  const { byId: entityById, byName: entitiesByName } = buildEntityIndexes(kbEntities);
  const evidenceByEntityId = await fetchEvidenceByEntityId(supabase, kbEntities.map((row) => row.id));

  const maintenanceReviews = buildReviewRows(
    'maintenance',
    TABLE_ITEMS,
    maintenanceRows,
    entityById,
    entitiesByName,
    evidenceByEntityId,
  );

  const diagnosticReviews = buildReviewRows(
    'diagnostic',
    TABLE_ITEMS,
    diagnosticRows,
    entityById,
    entitiesByName,
    evidenceByEntityId,
  );

  const maintenanceCounts = countByStatus(maintenanceReviews);
  const diagnosticCounts = countByStatus(diagnosticReviews);
  const evidenceAttachedTotal = [...maintenanceReviews, ...diagnosticReviews].filter(
    (row) => row.evidencePage !== null || row.evidenceSnippet,
  ).length;
  const weakAnchorTotal = [...maintenanceReviews, ...diagnosticReviews].filter(
    (row) => row.anchorStrength === 'NONE',
  ).length;

  const summary: Summary = {
    ai_delivery_run_id: runContext.aiDeliveryRunId,
    machine_id: runContext.machineId,
    kb_id: runContext.kbId,
    maintenance_total: maintenanceReviews.length,
    maintenance_keep_count: maintenanceCounts.keep,
    maintenance_needs_review_count: maintenanceCounts.needsReview,
    maintenance_reject_count: maintenanceCounts.reject,
    diagnostic_total: diagnosticReviews.length,
    diagnostic_keep_count: diagnosticCounts.keep,
    diagnostic_needs_review_count: diagnosticCounts.needsReview,
    diagnostic_reject_count: diagnosticCounts.reject,
    evidence_attached_total: evidenceAttachedTotal,
    weak_anchor_total: weakAnchorTotal,
    exported_at: new Date().toISOString(),
  };

  await writeExports(summary, maintenanceReviews, diagnosticReviews);
  const validationRunId = await persistResults(supabase, summary, maintenanceReviews, diagnosticReviews);

  const usefulMaintenance = maintenanceReviews.find((row) => row.semanticStatus === 'KEEP')?.title ?? 'N/A';
  const usefulDiagnostic = diagnosticReviews.find((row) => row.semanticStatus === 'KEEP')?.title ?? 'N/A';
  const issue1 = [...maintenanceReviews, ...diagnosticReviews].find((row) => row.semanticStatus !== 'KEEP')?.semanticReason ?? 'None detected';
  const issue2 = [...maintenanceReviews, ...diagnosticReviews]
    .filter((row) => row.semanticStatus !== 'KEEP')
    .map((row) => row.semanticReason)
    .find((reason) => reason !== issue1) ?? 'None detected';

  console.log('RESULT_AI_SEMANTIC_VALIDATION');
  console.log(`- semantic_validation_run_created: PASS`);
  console.log(`- validation_run_id: ${validationRunId}`);
  console.log(`- ai_delivery_run_id: ${summary.ai_delivery_run_id}`);
  console.log(`- maintenance_total: ${summary.maintenance_total}`);
  console.log(`- maintenance_keep_count: ${summary.maintenance_keep_count}`);
  console.log(`- maintenance_needs_review_count: ${summary.maintenance_needs_review_count}`);
  console.log(`- maintenance_reject_count: ${summary.maintenance_reject_count}`);
  console.log(`- diagnostic_total: ${summary.diagnostic_total}`);
  console.log(`- diagnostic_keep_count: ${summary.diagnostic_keep_count}`);
  console.log(`- diagnostic_needs_review_count: ${summary.diagnostic_needs_review_count}`);
  console.log(`- diagnostic_reject_count: ${summary.diagnostic_reject_count}`);
  console.log(`- evidence_attached_total: ${summary.evidence_attached_total}`);
  console.log(`- weak_anchor_total: ${summary.weak_anchor_total}`);
  console.log(`- useful_maintenance_item_1: ${usefulMaintenance}`);
  console.log(`- useful_diagnostic_case_1: ${usefulDiagnostic}`);
  console.log(`- major_semantic_issue_1: ${issue1}`);
  console.log(`- major_semantic_issue_2: ${issue2}`);
  console.log('');
  console.log('EXPORTS_AI_SEMANTIC_VALIDATION');
  console.log('- artifacts/ai-semantic-validation/maintenance_semantic_review.csv: PASS');
  console.log('- artifacts/ai-semantic-validation/diagnostic_semantic_review.csv: PASS');
  console.log('- artifacts/ai-semantic-validation/summary.json: PASS');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('RESULT_AI_SEMANTIC_VALIDATION');
  console.error('- semantic_validation_run_created: FAIL');
  console.error(`- error: ${message}`);
  process.exitCode = 1;
});
