/**
 * ENVIROJIM — buildFamilyKnowledge
 * Single-command orchestrator:
 * 1. Bootstrap family
 * 2. Ingest docs (if not yet ingested)
 * 3. Build knowledge base from each doc
 * 4. Validate parts (report blocked count)
 * 5. Print summary
 *
 * Usage (ts-node or tsx):
 *   tsx src/lib/machines/intelligence/cli/buildFamilyKnowledge.ts \
 *     --family vb750 \
 *     --manufacturer Doppstadt \
 *     --brand Doppstadt \
 *     --model VB750
 *
 * Or programmatically:
 *   import { buildFamilyKnowledge } from './buildFamilyKnowledge';
 *   await buildFamilyKnowledge({ family_code: 'vb750', ... });
 */

// Load .env.local for CLI context (Next.js doesn't auto-load these outside server)
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { bootstrapFamily, type BootstrapFamilyParams } from '../bootstrap/bootstrapFamily';
import { KnowledgeBuildOrchestrator } from '../orchestration/KnowledgeBuildOrchestrator';
import { MachineKnowledgeRepository } from '../repositories/MachineKnowledgeRepository';

export interface BuildFamilyKnowledgeParams extends BootstrapFamilyParams {
  /** If provided, only process this specific source_document_id */
  source_document_id?: string;
  /** Dry run — bootstrap only, no extraction */
  dry_run?: boolean;
}

export interface BuildFamilyKnowledgeSummary {
  family_id: string;
  bootstrapped: boolean;
  documents_processed: number;
  total_stats: {
    parts_inserted: number;
    parts_blocked: number;
    procedures: number;
    symptoms: number;
    causes: number;
    diagnostic_links: number;
    maintenance_tasks: number;
    checklists: number;
  };
  blocking_issues_count: number;
  errors: string[];
}

export async function buildFamilyKnowledge(
  params: BuildFamilyKnowledgeParams,
): Promise<BuildFamilyKnowledgeSummary> {
  const supabase = createAiCoreClient();
  const errors: string[] = [];

  // ─── 1. Bootstrap ──────────────────────────────────────────────────────────
  console.log(`[buildFamilyKnowledge] Bootstrapping family: ${params.family_code}`);
  const bootstrap = await bootstrapFamily(params);
  console.log(`  family_id=${bootstrap.family_id} created=${bootstrap.created}`);

  if (params.dry_run) {
    return {
      family_id: bootstrap.family_id,
      bootstrapped: true,
      documents_processed: 0,
      total_stats: { parts_inserted: 0, parts_blocked: 0, procedures: 0, symptoms: 0, causes: 0, diagnostic_links: 0, maintenance_tasks: 0, checklists: 0 },
      blocking_issues_count: 0,
      errors: [],
    };
  }

  // ─── 2. Find docs to process ───────────────────────────────────────────────
  let query = supabase
    .from('source_documents')
    .select('id, doc_key, doc_type, parse_status, title')
    .eq('family_id', bootstrap.family_id)
    .eq('parse_status', 'parsed')
    .eq('is_synthetic', false); // never process bootstrap placeholder docs

  if (params.source_document_id) {
    query = query.eq('id', params.source_document_id) as any;
  }

  const { data: docs, error: docsError } = await query;
  if (docsError) throw new Error(`buildFamilyKnowledge: ${docsError.message}`);

  console.log(`[buildFamilyKnowledge] Found ${docs?.length ?? 0} parsed document(s) to process`);

  // ─── 3. Build knowledge from each doc ─────────────────────────────────────
  const orchestrator = new KnowledgeBuildOrchestrator();
  const totalStats = {
    parts_inserted: 0, parts_blocked: 0, procedures: 0,
    symptoms: 0, causes: 0, diagnostic_links: 0,
    maintenance_tasks: 0, checklists: 0,
  };

  let docsProcessed = 0;

  for (const doc of docs ?? []) {
    console.log(`  Processing: ${doc.title} (${doc.doc_type})`);
    try {
      const result = await orchestrator.buildFromDocument(doc.id, params);
      docsProcessed++;
      totalStats.parts_inserted += result.stats.parts_inserted;
      totalStats.parts_blocked += result.stats.parts_blocked;
      totalStats.procedures += result.stats.procedures;
      totalStats.symptoms += result.stats.symptoms;
      totalStats.causes += result.stats.causes;
      totalStats.diagnostic_links += result.stats.diagnostic_links;
      totalStats.maintenance_tasks += result.stats.maintenance_tasks;
      totalStats.checklists += result.stats.checklists;

      if (result.errors.length > 0) {
        errors.push(...result.errors.map(e => `[${doc.doc_key}] ${e}`));
        result.errors.forEach(e => console.error(`    !! ${e}`));
      }

      console.log(`    → parts: +${result.stats.parts_inserted} (${result.stats.parts_blocked} blocked)`);
      console.log(`    → procedures: ${result.stats.procedures}, faults: ${result.stats.symptoms}/${result.stats.causes}, links: ${result.stats.diagnostic_links}`);
    } catch (e) {
      const msg = `buildFamilyKnowledge: failed on ${doc.id}: ${e}`;
      errors.push(msg);
      console.error(`  ERROR: ${msg}`);
    }
  }

  // ─── 4. Validate parts ─────────────────────────────────────────────────────
  const repo = new MachineKnowledgeRepository();
  const blockingIssues = await repo.getBlockingIssues(bootstrap.family_id);
  const blockingIssuesCount = blockingIssues.length;

  if (blockingIssuesCount > 0) {
    console.warn(`[buildFamilyKnowledge] ⚠ ${blockingIssuesCount} blocking data quality issues`);
  }

  // ─── 5. Summary ────────────────────────────────────────────────────────────
  const summary: BuildFamilyKnowledgeSummary = {
    family_id: bootstrap.family_id,
    bootstrapped: bootstrap.created,
    documents_processed: docsProcessed,
    total_stats: totalStats,
    blocking_issues_count: blockingIssuesCount,
    errors,
  };

  console.log('\n[buildFamilyKnowledge] ─── SUMMARY ───');
  console.log(`  Family ID   : ${summary.family_id}`);
  console.log(`  Docs        : ${summary.documents_processed}`);
  console.log(`  Parts       : +${totalStats.parts_inserted} (${totalStats.parts_blocked} blocked)`);
  console.log(`  Procedures  : ${totalStats.procedures}`);
  console.log(`  Faults      : ${totalStats.symptoms} symptoms / ${totalStats.causes} causes / ${totalStats.diagnostic_links} links`);
  console.log(`  Maintenance : ${totalStats.maintenance_tasks} tasks`);
  console.log(`  Checklists  : ${totalStats.checklists}`);
  console.log(`  Blockers    : ${blockingIssuesCount}`);
  if (errors.length > 0) console.error(`  Errors      : ${errors.length}`);
  console.log('─────────────────────────────────────\n');

  return summary;
}

// ─── CLI entry point ──────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const params: BuildFamilyKnowledgeParams = {
    family_code: get('--family') ?? '',
    manufacturer: get('--manufacturer') ?? '',
    brand: get('--brand') ?? '',
    model: get('--model') ?? '',
    source_document_id: get('--doc') ?? undefined,
    dry_run: args.includes('--dry-run'),
  };

  if (!params.family_code || !params.manufacturer || !params.brand || !params.model) {
    console.error('Usage: buildFamilyKnowledge --family <code> --manufacturer <name> --brand <name> --model <name> [--doc <id>] [--dry-run]');
    process.exit(1);
  }

  buildFamilyKnowledge(params)
    .then(summary => {
      if (summary.errors.length > 0) process.exit(1);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
