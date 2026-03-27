/**
 * Ordered write test: ProcedureExtractor → MaintenanceExtractor on 1 maintenance_manual doc
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { ProcedureExtractor } from '../extractors/ProcedureExtractor';
import { MaintenanceExtractor } from '../extractors/MaintenanceExtractor';

const FAMILY_ID = '21e08969-c319-45ef-af36-088944b3ae72';
const DOC_ID = '7dc4e95d-8fd1-4d1a-ac22-d62688beb27b'; // maintenance_manual
const SUBSYSTEM_ID = '176810e0-7cc5-40a1-b765-97834dfa2633'; // global

async function counts(client: ReturnType<typeof createAiCoreClient>) {
  const [{ count: proc }, { count: task }, { count: ev }, { count: dqi }] = await Promise.all([
    client.from('procedures').select('id', { count: 'exact', head: true }).eq('family_id', FAMILY_ID),
    client.from('maintenance_tasks').select('id', { count: 'exact', head: true }).eq('family_id', FAMILY_ID),
    client.from('evidence').select('id', { count: 'exact', head: true }).eq('family_id', FAMILY_ID),
    client.from('data_quality_issues').select('id', { count: 'exact', head: true }).eq('family_id', FAMILY_ID),
  ]);
  return { proc: proc ?? 0, task: task ?? 0, ev: ev ?? 0, dqi: dqi ?? 0 };
}

async function main() {
  const client = createAiCoreClient();

  // Fetch pages
  const { data: pages, error } = await client
    .from('document_pages')
    .select('page_number, raw_text')
    .eq('source_document_id', DOC_ID)
    .order('page_number');
  if (error) { console.error('DB error:', error.message); process.exit(1); }
  const pageTexts = (pages ?? []).map(p => ({ pageNumber: p.page_number, text: p.raw_text }));
  console.log(`Pages: ${pageTexts.length}`);

  const before = await counts(client);
  console.log(`BEFORE: procedures=${before.proc}, tasks=${before.task}, evidence=${before.ev}, dqi=${before.dqi}`);

  // STEP 1: ProcedureExtractor
  console.log('\n[1/2] ProcedureExtractor...');
  const procExtractor = new ProcedureExtractor();
  const procCreated = await procExtractor.extract({ family_id: FAMILY_ID, source_document_id: DOC_ID, bootstrap_subsystem_id: SUBSYSTEM_ID, page_texts: pageTexts });
  console.log(`  → procedures returned: ${procCreated}`);

  const mid = await counts(client);
  console.log(`  → DB after proc: procedures=${mid.proc} (+${mid.proc - before.proc})`);

  // STEP 2: MaintenanceExtractor
  console.log('\n[2/2] MaintenanceExtractor...');
  const maintExtractor = new MaintenanceExtractor();
  const maintResult = await maintExtractor.extract({ family_id: FAMILY_ID, source_document_id: DOC_ID, bootstrap_subsystem_id: SUBSYSTEM_ID, page_texts: pageTexts });
  console.log(`  → created=${maintResult.created}, skipped=${maintResult.skipped}, dqi=${maintResult.dqi}`);

  const after = await counts(client);
  console.log(`\nAFTER: procedures=${after.proc}, tasks=${after.task}, evidence=${after.ev}, dqi=${after.dqi}`);
  console.log(`DELTA: procedures=+${after.proc - before.proc}, tasks=+${after.task - before.task}, evidence=+${after.ev - before.ev}, dqi=+${after.dqi - before.dqi}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
