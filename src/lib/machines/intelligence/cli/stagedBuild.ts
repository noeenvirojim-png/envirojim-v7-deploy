/**
 * ENVIROJIM — stagedBuild
 * Runs extractors in order across all eligible docs for a family.
 * Skips docs where extraction_job already succeeded for that object_type.
 *
 * Order: ProcedureExtractor → MaintenanceExtractor → ChecklistExtractor → FaultExtractor → PartExtractor
 *
 * Usage:
 *   tsx src/lib/machines/intelligence/cli/stagedBuild.ts \
 *     --family vb750_dk --manufacturer HAMMEL --brand HAMMEL --model "VB750 DK"
 */

import path from 'path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { bootstrapFamily } from '../bootstrap/bootstrapFamily';
import { ProcedureExtractor } from '../extractors/ProcedureExtractor';
import { MaintenanceExtractor } from '../extractors/MaintenanceExtractor';
import { ChecklistExtractor } from '../extractors/ChecklistExtractor';
import { FaultExtractor } from '../extractors/FaultExtractor';
import { PartExtractor } from '../extractors/PartExtractor';

const FAMILY_CODE = process.argv[process.argv.indexOf('--family') + 1] ?? '';
const MANUFACTURER = process.argv[process.argv.indexOf('--manufacturer') + 1] ?? '';
const BRAND = process.argv[process.argv.indexOf('--brand') + 1] ?? '';
const MODEL = process.argv[process.argv.indexOf('--model') + 1] ?? '';

if (!FAMILY_CODE || !MANUFACTURER || !BRAND || !MODEL) {
  console.error('Usage: stagedBuild --family <code> --manufacturer <n> --brand <n> --model <n>');
  process.exit(1);
}

// Doc types eligible per extractor
const ELIGIBLE: Record<string, string[]> = {
  procedure:         ['maintenance_manual', 'operating_manual', 'short_manual', 'service_bulletin', 'faults_and_remedy'],
  maintenance_task:  ['maintenance_manual', 'operating_manual'],
  checklist_template:['maintenance_manual', 'operating_manual', 'short_manual'],
  fault_symptom:     ['faults_and_remedy', 'maintenance_manual', 'service_bulletin'],
  part:              ['spare_parts_list', 'hydraulic_parts_list', 'electrical_material_list', 'service_bulletin'],
};

async function getOrCreateRunId(supabase: ReturnType<typeof createAiCoreClient>, familyId: string): Promise<string> {
  // Reuse an existing 'running' run or create one
  const { data: existing } = await supabase
    .from('ingestion_runs')
    .select('id')
    .eq('family_id', familyId)
    .eq('status', 'running')
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: run } = await supabase
    .from('ingestion_runs')
    .insert({ family_id: familyId, status: 'running', source_count: 1 })
    .select('id')
    .single();
  return run!.id;
}

async function isSucceeded(
  supabase: ReturnType<typeof createAiCoreClient>,
  sourceDocumentId: string,
  objectType: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('extraction_jobs')
    .select('id')
    .eq('source_document_id', sourceDocumentId)
    .eq('object_type', objectType)
    .eq('status', 'succeeded')
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function markJob(
  supabase: ReturnType<typeof createAiCoreClient>,
  runId: string,
  sourceDocumentId: string,
  objectType: string,
  status: 'succeeded' | 'failed',
  statsJson: Record<string, number>,
  errorMessage?: string,
) {
  // Upsert by (source_document_id, object_type, ingestion_run_id)
  await supabase.from('extraction_jobs').upsert({
    ingestion_run_id: runId,
    source_document_id: sourceDocumentId,
    object_type: objectType,
    status,
    finished_at: new Date().toISOString(),
    stats_json: statsJson,
    error_message: errorMessage ?? null,
  }, { onConflict: 'ingestion_run_id,source_document_id,object_type' });
}

async function loadPages(
  supabase: ReturnType<typeof createAiCoreClient>,
  docId: string,
): Promise<Array<{ pageNumber: number; text: string }>> {
  const { data } = await supabase
    .from('document_pages')
    .select('page_number, raw_text')
    .eq('source_document_id', docId)
    .order('page_number');
  return (data ?? []).map(p => ({ pageNumber: p.page_number, text: p.raw_text ?? '' }));
}

async function runStage<T>(
  label: string,
  objectType: string,
  docs: Array<{ id: string; title: string; doc_type: string }>,
  runId: string,
  supabase: ReturnType<typeof createAiCoreClient>,
  familyId: string,
  bootstrapIds: { subsystem: string; assembly: string; component: string },
  extractFn: (docId: string, pages: Array<{ pageNumber: number; text: string }>) => Promise<T>,
  summarizeFn: (result: T) => Record<string, number>,
): Promise<{ totalStats: Record<string, number>; skipped: number; failed: number }> {
  const eligible = docs.filter(d => ELIGIBLE[objectType].includes(d.doc_type));
  console.log(`\n[${label}] ${eligible.length} eligible docs`);

  const totals: Record<string, number> = {};
  let skipped = 0;
  let failed = 0;

  for (const doc of eligible) {
    const alreadyDone = await isSucceeded(supabase, doc.id, objectType);
    if (alreadyDone) {
      console.log(`  SKIP ${doc.title.slice(0, 60)} (already succeeded)`);
      skipped++;
      continue;
    }

    console.log(`  → ${doc.title.slice(0, 60)}`);
    try {
      const pages = await loadPages(supabase, doc.id);
      if (pages.length === 0) {
        console.warn(`    !! no pages — skip`);
        failed++;
        await markJob(supabase, runId, doc.id, objectType, 'failed', {}, 'no pages');
        continue;
      }

      const result = await extractFn(doc.id, pages);
      const stats = summarizeFn(result);
      await markJob(supabase, runId, doc.id, objectType, 'succeeded', stats);
      for (const [k, v] of Object.entries(stats)) totals[k] = (totals[k] ?? 0) + v;
      console.log(`    ✓ ${JSON.stringify(stats)}`);
    } catch (e) {
      const msg = String(e);
      console.error(`    !! FAILED: ${msg.slice(0, 200)}`);
      await markJob(supabase, runId, doc.id, objectType, 'failed', {}, msg.slice(0, 500));
      failed++;
    }
  }

  console.log(`  TOTAL ${label}: ${JSON.stringify(totals)} | skipped=${skipped} failed=${failed}`);
  return { totalStats: totals, skipped, failed };
}

async function main() {
  const supabase = createAiCoreClient();

  // Bootstrap
  const bootstrap = await bootstrapFamily({ family_code: FAMILY_CODE, manufacturer: MANUFACTURER, brand: BRAND, model: MODEL });
  const familyId = bootstrap.family_id;
  const subsystemId = bootstrap.subsystem_ids['global'];
  const assemblyId = bootstrap.assembly_ids['global'];
  const componentId = bootstrap.component_ids['global'];
  console.log(`Family: ${familyId}`);

  const runId = await getOrCreateRunId(supabase, familyId);
  console.log(`Run: ${runId}`);

  // Load all eligible docs
  const { data: docs, error } = await supabase
    .from('source_documents')
    .select('id, title, doc_type')
    .eq('family_id', familyId)
    .eq('parse_status', 'parsed')
    .eq('is_synthetic', false);
  if (error) throw new Error(error.message);
  console.log(`Total parsed docs: ${docs?.length ?? 0}`);
  const allDocs = docs ?? [];

  const bootstrapIds = { subsystem: subsystemId, assembly: assemblyId, component: componentId };

  // ─── STAGE 1: ProcedureExtractor ────────────────────────────────────────────
  const procExtractor = new ProcedureExtractor();
  const stage1 = await runStage(
    'ProcedureExtractor', 'procedure', allDocs, runId, supabase, familyId, bootstrapIds,
    (docId, pages) => procExtractor.extract({ family_id: familyId, source_document_id: docId, bootstrap_subsystem_id: subsystemId, page_texts: pages }),
    (count) => ({ procedures: count as number }),
  );

  // ─── STAGE 2: MaintenanceExtractor ──────────────────────────────────────────
  const maintExtractor = new MaintenanceExtractor();
  const stage2 = await runStage(
    'MaintenanceExtractor', 'maintenance_task', allDocs, runId, supabase, familyId, bootstrapIds,
    (docId, pages) => maintExtractor.extract({ family_id: familyId, source_document_id: docId, bootstrap_subsystem_id: subsystemId, page_texts: pages }),
    (count) => ({ maintenance_tasks: count as number }),
  );

  // ─── STAGE 3: ChecklistExtractor ────────────────────────────────────────────
  const clExtractor = new ChecklistExtractor();
  const stage3 = await runStage(
    'ChecklistExtractor', 'checklist_template', allDocs, runId, supabase, familyId, bootstrapIds,
    (docId, pages) => clExtractor.extract({ family_id: familyId, source_document_id: docId, bootstrap_subsystem_id: subsystemId, page_texts: pages }),
    (count) => ({ checklists: count as number }),
  );

  // ─── STAGE 4: FaultExtractor ────────────────────────────────────────────────
  const faultExtractor = new FaultExtractor();
  const stage4 = await runStage(
    'FaultExtractor', 'fault_symptom', allDocs, runId, supabase, familyId, bootstrapIds,
    (docId, pages) => faultExtractor.extract({ family_id: familyId, source_document_id: docId, bootstrap_subsystem_id: subsystemId, page_texts: pages }),
    (r: any) => ({ symptoms: r.symptoms, causes: r.causes, links: r.links }),
  );

  // ─── STAGE 5: PartExtractor ─────────────────────────────────────────────────
  const partExtractor = new PartExtractor();
  const stage5 = await runStage(
    'PartExtractor', 'part', allDocs, runId, supabase, familyId, bootstrapIds,
    (docId, pages) => partExtractor.extract({ family_id: familyId, source_document_id: docId, bootstrap_subsystem_id: subsystemId, bootstrap_assembly_id: assemblyId, bootstrap_component_id: componentId, page_texts: pages }),
    (r: any) => ({ parts_inserted: r.inserted, parts_blocked: r.blocked }),
  );

  // ─── Final DB snapshot ──────────────────────────────────────────────────────
  const { data: snap } = await supabase.rpc('exec_sql' as any, { sql: '' }).maybeSingle(); // no rpc needed, direct queries:

  const counts = await Promise.all([
    supabase.from('procedures').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('maintenance_tasks').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('checklist_templates').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('fault_symptoms').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('fault_causes').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('parts').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('parts').select('*', { count: 'exact', head: true }).eq('family_id', familyId).eq('order_safety_status', 'official_confirmed'),
    supabase.from('parts').select('*', { count: 'exact', head: true }).eq('family_id', familyId).eq('order_safety_status', 'blocked_incomplete'),
    supabase.from('evidence').select('*', { count: 'exact', head: true }).eq('family_id', familyId),
    supabase.from('data_quality_issues').select('*', { count: 'exact', head: true }).eq('family_id', familyId).eq('is_blocking', true),
    supabase.from('checklist_items').select('*', { count: 'exact', head: true }),
    supabase.from('diagnostic_tests').select('*', { count: 'exact', head: true }),
  ]);

  // Mark run complete
  const anyFailed = stage1.failed + stage2.failed + stage3.failed + stage4.failed + stage5.failed > 0;
  await supabase.from('ingestion_runs').update({
    status: anyFailed ? 'partial' : 'succeeded',
    finished_at: new Date().toISOString(),
  }).eq('id', runId);

  console.log('\n══════════════════ FINAL SNAPSHOT ══════════════════');
  console.log(`procedures:            ${counts[0].count}`);
  console.log(`maintenance_tasks:     ${counts[1].count}`);
  console.log(`checklist_templates:   ${counts[2].count}`);
  console.log(`fault_symptoms:        ${counts[3].count}`);
  console.log(`fault_causes:          ${counts[4].count}`);
  console.log(`parts total:           ${counts[5].count}`);
  console.log(`parts official_conf:   ${counts[6].count}`);
  console.log(`parts blocked:         ${counts[7].count}`);
  console.log(`evidence:              ${counts[8].count}`);
  console.log(`blocking DQI:          ${counts[9].count}`);
  console.log(`checklist_items:       ${counts[10].count}`);
  console.log(`diagnostic_tests:      ${counts[11].count}`);
  console.log('════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
