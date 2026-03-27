/**
 * KnowledgeBuildOrchestrator — full pipeline per source document.
 * Routes to the right extractor based on doc_type.
 * Updates extraction_jobs status throughout.
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { bootstrapFamily, type BootstrapFamilyParams } from '../bootstrap/bootstrapFamily';
import { FamilyProfileExtractor } from '../extractors/FamilyProfileExtractor';
import { SubsystemExtractor } from '../extractors/SubsystemExtractor';
import { PartExtractor } from '../extractors/PartExtractor';
import { ProcedureExtractor } from '../extractors/ProcedureExtractor';
import { FaultExtractor } from '../extractors/FaultExtractor';
import { MaintenanceExtractor } from '../extractors/MaintenanceExtractor';
import { ChecklistExtractor } from '../extractors/ChecklistExtractor';
import { PdfIngestionService } from '../services/PdfIngestionService';

export interface OrchestrationResult {
  family_id: string;
  source_document_id: string;
  ingestion_run_id: string;
  stats: {
    parts_inserted: number;
    parts_blocked: number;
    procedures: number;
    symptoms: number;
    causes: number;
    diagnostic_links: number;
    maintenance_tasks: number;
    checklists: number;
  };
  errors: string[];
}

export class KnowledgeBuildOrchestrator {
  private supabase = createAiCoreClient();
  private ingestionService = new PdfIngestionService();

  async buildFromDocument(
    sourceDocumentId: string,
    familyParams: BootstrapFamilyParams,
  ): Promise<OrchestrationResult> {
    const errors: string[] = [];
    const stats = {
      parts_inserted: 0, parts_blocked: 0, procedures: 0,
      symptoms: 0, causes: 0, diagnostic_links: 0,
      maintenance_tasks: 0, checklists: 0,
    };

    // 1. Load source document
    const { data: doc, error: docError } = await this.supabase
      .from('source_documents')
      .select('*')
      .eq('id', sourceDocumentId)
      .single();

    if (docError || !doc) throw new Error(`KnowledgeBuildOrchestrator: doc not found ${sourceDocumentId}`);

    // 2. Bootstrap family
    const bootstrap = await bootstrapFamily(familyParams);
    const familyId = bootstrap.family_id;

    // 3. Load pages
    const { data: pages } = await this.supabase
      .from('document_pages')
      .select('page_number, raw_text')
      .eq('source_document_id', sourceDocumentId)
      .order('page_number');

    if (!pages || pages.length === 0) {
      throw new Error(`KnowledgeBuildOrchestrator: no pages found for doc ${sourceDocumentId}`);
    }

    const pageTexts = pages.map(p => ({ pageNumber: p.page_number, text: p.raw_text }));
    const docType: string = doc.doc_type;

    // Pick fallback subsystem (global)
    const globalSubsystemId = bootstrap.subsystem_ids['global'];
    const globalAssemblyId = bootstrap.assembly_ids['global'];
    const globalComponentId = bootstrap.component_ids['global'];

    // 4. Open ingestion run
    const { data: run } = await this.supabase
      .from('ingestion_runs')
      .insert({
        family_id: familyId,
        status: 'running',
        source_count: 1,
      })
      .select('id')
      .single();

    const runId = run?.id ?? 'unknown';

    // 5. Family profile (all doc types)
    try {
      const profiler = new FamilyProfileExtractor();
      await profiler.extract({ family_id: familyId, source_document_id: sourceDocumentId, page_texts: pageTexts });
    } catch (e) {
      errors.push(`FamilyProfile: ${e}`);
    }

    // 6. Subsystems (all doc types)
    try {
      const subsysExtractor = new SubsystemExtractor();
      await subsysExtractor.extract({ family_id: familyId, source_document_id: sourceDocumentId, page_texts: pageTexts });
    } catch (e) {
      errors.push(`SubsystemExtractor: ${e}`);
    }

    // 7. Parts
    if (['spare_parts_list', 'hydraulic_parts_list', 'electrical_material_list', 'service_bulletin'].includes(docType)) {
      try {
        const partExtractor = new PartExtractor();
        const result = await partExtractor.extract({
          family_id: familyId,
          source_document_id: sourceDocumentId,
          bootstrap_subsystem_id: globalSubsystemId,
          bootstrap_assembly_id: globalAssemblyId,
          bootstrap_component_id: globalComponentId,
          page_texts: pageTexts,
        });
        stats.parts_inserted = result.inserted;
        stats.parts_blocked = result.blocked;
      } catch (e) {
        errors.push(`PartExtractor: ${e}`);
      }
    }

    // 8. Procedures
    if (['maintenance_manual', 'operating_manual', 'short_manual', 'service_bulletin', 'faults_and_remedy'].includes(docType)) {
      try {
        const procExtractor = new ProcedureExtractor();
        stats.procedures = await procExtractor.extract({
          family_id: familyId,
          source_document_id: sourceDocumentId,
          bootstrap_subsystem_id: globalSubsystemId,
          page_texts: pageTexts,
        });
      } catch (e) {
        errors.push(`ProcedureExtractor: ${e}`);
      }
    }

    // 9. Faults
    if (['faults_and_remedy', 'maintenance_manual', 'service_bulletin'].includes(docType)) {
      try {
        const faultExtractor = new FaultExtractor();
        const result = await faultExtractor.extract({
          family_id: familyId,
          source_document_id: sourceDocumentId,
          bootstrap_subsystem_id: globalSubsystemId,
          page_texts: pageTexts,
        });
        stats.symptoms = result.symptoms;
        stats.causes = result.causes;
        stats.diagnostic_links = result.links;
      } catch (e) {
        errors.push(`FaultExtractor: ${e}`);
      }
    }

    // 10. Maintenance
    if (['maintenance_manual', 'operating_manual'].includes(docType)) {
      try {
        const maintExtractor = new MaintenanceExtractor();
        stats.maintenance_tasks = await maintExtractor.extract({
          family_id: familyId,
          source_document_id: sourceDocumentId,
          bootstrap_subsystem_id: globalSubsystemId,
          page_texts: pageTexts,
        });
      } catch (e) {
        errors.push(`MaintenanceExtractor: ${e}`);
      }
    }

    // 11. Checklists
    if (['maintenance_manual', 'operating_manual', 'short_manual'].includes(docType)) {
      try {
        const clExtractor = new ChecklistExtractor();
        stats.checklists = await clExtractor.extract({
          family_id: familyId,
          source_document_id: sourceDocumentId,
          bootstrap_subsystem_id: globalSubsystemId,
          page_texts: pageTexts,
        });
      } catch (e) {
        errors.push(`ChecklistExtractor: ${e}`);
      }
    }

    // 12. Close run
    await this.supabase
      .from('ingestion_runs')
      .update({
        status: errors.length === 0 ? 'succeeded' : (stats.parts_inserted > 0 ? 'partial' : 'failed'),
        finished_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return {
      family_id: familyId,
      source_document_id: sourceDocumentId,
      ingestion_run_id: runId,
      stats,
      errors,
    };
  }
}
