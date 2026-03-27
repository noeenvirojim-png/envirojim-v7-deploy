/**
 * ENVIROJIM — PdfIngestionService
 * Pipeline:
 * 1. Register source_document
 * 2. Store document_pages (one row per page)
 * 3. Open ingestion_run
 * 4. Open extraction_jobs per object type
 * 5. Caller extracts objects → passes back → service records evidence + triggers validation
 * 6. Block incomplete objects via data_quality_issues
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import type { DocType, ExtractionObjectType, RunStatus } from '../contracts';
import { extractPdfPages } from '@/domain/ai/utils/pdf-page-extractor';

export interface RegisterDocumentParams {
  family_id: string;
  doc_key: string;
  title: string;
  doc_type: DocType;
  language_code?: string;
  revision_label?: string;
  source_filename: string;
  file_sha256: string;
  storage_path: string;
  file_buffer: Buffer;
}

export interface IngestionRunResult {
  source_document_id: string;
  ingestion_run_id: string;
  extraction_job_ids: Record<ExtractionObjectType, string>;
  page_count: number;
}

const OBJECT_TYPES_BY_DOC_TYPE: Record<DocType, ExtractionObjectType[]> = {
  spare_parts_list: ['part', 'assembly', 'component'],
  hydraulic_parts_list: ['part', 'assembly', 'component'],
  electrical_material_list: ['part', 'component'],
  maintenance_manual: ['procedure', 'maintenance_task', 'checklist_template'],
  faults_and_remedy: ['fault_symptom', 'fault_cause', 'diagnostic_test'],
  operating_manual: ['procedure', 'checklist_template', 'log_signal'],
  short_manual: ['procedure', 'checklist_template'],
  service_bulletin: ['procedure', 'part', 'fault_cause'],
  other: ['part', 'procedure'],
};

export class PdfIngestionService {
  private supabase = createAiCoreClient();

  async ingest(params: RegisterDocumentParams): Promise<IngestionRunResult> {
    // 1. Check for duplicate by sha256
    const { data: existing } = await this.supabase
      .from('source_documents')
      .select('id, parse_status')
      .eq('file_sha256', params.file_sha256)
      .maybeSingle();

    if (existing) {
      throw new Error(`PdfIngestionService: document with sha256 ${params.file_sha256} already exists (id=${existing.id})`);
    }

    // 2. Extract pages
    const pages = await extractPdfPages(params.file_buffer);
    if (!pages || pages.length === 0) {
      throw new Error(`PdfIngestionService: could not extract pages from ${params.source_filename}`);
    }

    // 3. Register source_document
    const { data: doc, error: docError } = await this.supabase
      .from('source_documents')
      .insert({
        family_id: params.family_id,
        doc_key: params.doc_key,
        title: params.title,
        doc_type: params.doc_type,
        language_code: params.language_code ?? 'en',
        revision_label: params.revision_label ?? 'not_in_source_document',
        source_filename: params.source_filename,
        file_sha256: params.file_sha256,
        page_count: pages.length,
        storage_path: params.storage_path,
        parse_status: 'queued',
      })
      .select('id')
      .single();

    if (docError) throw new Error(`PdfIngestionService.registerDoc: ${docError.message}`);
    const sourceDocumentId = doc.id;

    // 4. Store document_pages
    const pageRows = pages.map(p => ({
      source_document_id: sourceDocumentId,
      page_number: p.pageNumber,
      raw_text: p.text,
      normalized_text: p.text.toLowerCase().replace(/\s+/g, ' ').trim(),
      page_sha256: '',
    }));

    const { error: pagesError } = await this.supabase
      .from('document_pages')
      .insert(pageRows);

    if (pagesError) throw new Error(`PdfIngestionService.storePages: ${pagesError.message}`);

    // Mark parsed
    await this.supabase
      .from('source_documents')
      .update({ parse_status: 'parsed' })
      .eq('id', sourceDocumentId);

    // 5. Open ingestion_run
    const { data: run, error: runError } = await this.supabase
      .from('ingestion_runs')
      .insert({
        family_id: params.family_id,
        status: 'running',
        source_count: 1,
      })
      .select('id')
      .single();

    if (runError) throw new Error(`PdfIngestionService.openRun: ${runError.message}`);
    const ingestionRunId = run.id;

    // 6. Open extraction_jobs
    const objectTypes = OBJECT_TYPES_BY_DOC_TYPE[params.doc_type] ?? ['part', 'procedure'];
    const jobRows = objectTypes.map(ot => ({
      ingestion_run_id: ingestionRunId,
      source_document_id: sourceDocumentId,
      object_type: ot,
      status: 'queued' as RunStatus,
    }));

    const { data: jobs, error: jobsError } = await this.supabase
      .from('extraction_jobs')
      .insert(jobRows)
      .select('id, object_type');

    if (jobsError) throw new Error(`PdfIngestionService.openJobs: ${jobsError.message}`);

    const jobIds = (jobs ?? []).reduce((acc, j) => {
      acc[j.object_type as ExtractionObjectType] = j.id;
      return acc;
    }, {} as Record<ExtractionObjectType, string>);

    return {
      source_document_id: sourceDocumentId,
      ingestion_run_id: ingestionRunId,
      extraction_job_ids: jobIds,
      page_count: pages.length,
    };
  }

  async markJobSucceeded(jobId: string, stats: Record<string, unknown>): Promise<void> {
    await this.supabase
      .from('extraction_jobs')
      .update({ status: 'succeeded', finished_at: new Date().toISOString(), stats_json: stats })
      .eq('id', jobId);
  }

  async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('extraction_jobs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error_message: errorMessage })
      .eq('id', jobId);
  }

  async closeRun(runId: string, status: RunStatus): Promise<void> {
    await this.supabase
      .from('ingestion_runs')
      .update({ status, finished_at: new Date().toISOString() })
      .eq('id', runId);
  }

  async markDocumentFailed(sourceDocumentId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('source_documents')
      .update({ parse_status: 'failed' })
      .eq('id', sourceDocumentId);

    console.error(`PdfIngestionService: document ${sourceDocumentId} failed — ${errorMessage}`);
  }
}
