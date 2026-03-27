/**
 * MaintenanceExtractor — extracts maintenance_tasks and their parts from maintenance manuals.
 *
 * Resolution order for linked_procedure_id (NOT NULL FK):
 *  1. Exact ilike match on procedure_code
 *  2. Normalized title match (ilike on title)
 *  3. Create data_quality_issue — never silent skip
 */

import { MAX_CHUNK_CHARS } from '../modelConfig';
import { DEFAULT_EXTRACTION_MODEL } from '../config/geminiConfig';
import { runGeminiJsonExtraction } from '../clients/geminiClient';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { EvidenceService } from '../services/EvidenceService';

export interface MaintenanceExtractorInput {
  family_id: string;
  source_document_id: string;
  bootstrap_subsystem_id: string;
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface RawMaintenanceTask {
  task_code: string;
  title: string;
  interval_type: string;
  interval_value: number;
  trigger_rule: string;
  task_description: string;
  severity_if_skipped: string;
  linked_procedure_code: string;
  source_page: number;
  source_snippet: string;
  part_numbers: string[];
}

export class MaintenanceExtractor {
  private supabase = createAiCoreClient();
  private evidenceService = new EvidenceService();

  async extract(input: MaintenanceExtractorInput): Promise<{ created: number; skipped: number; dqi: number }> {
    // Pre-fetch all procedures for this family to give Gemini exact codes
    const { data: allProcs } = await this.supabase
      .from('procedures')
      .select('id, procedure_code, title')
      .eq('family_id', input.family_id);

    const procList = (allProcs ?? []).map(p => `  - code: "${p.procedure_code}" | title: "${p.title}"`).join('\n');

    const text = input.page_texts
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n')
      .slice(0, MAX_CHUNK_CHARS);

    const tasks = await this.extractFromText(text, procList, input.source_document_id);
    let created = 0;
    let skipped = 0;
    let dqi = 0;

    for (const task of tasks) {
      if (!task.task_code?.trim() || !task.source_snippet?.trim()) {
        skipped++;
        continue;
      }

      // Resolution 1: exact procedure_code match
      let proc = allProcs?.find(p => p.procedure_code.toLowerCase() === task.linked_procedure_code?.toLowerCase()) ?? null;

      // Resolution 2: normalized title match
      if (!proc && task.linked_procedure_code?.trim()) {
        const normalized = task.linked_procedure_code.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        proc = allProcs?.find(p => p.title.toLowerCase().includes(normalized) || normalized.includes(p.title.toLowerCase().slice(0, 15))) ?? null;
      }

      // Resolution 3: DQI, no insert
      if (!proc) {
        await this.supabase.from('data_quality_issues').insert({
          family_id: input.family_id,
          object_type: 'maintenance_task',
          object_id: input.source_document_id, // placeholder — no task yet
          issue_type: 'unresolved_procedure_link',
          issue_description: `task_code="${task.task_code}" linked_procedure_code="${task.linked_procedure_code ?? ''}" — no matching procedure found`,
          severity: 'medium',
          blocking_flag: false,
          detected_by: 'MaintenanceExtractor',
        });
        dqi++;
        skipped++;
        continue;
      }

      const { data: existing } = await this.supabase
        .from('maintenance_tasks')
        .select('id')
        .eq('family_id', input.family_id)
        .ilike('task_code', task.task_code)
        .maybeSingle();

      let taskId: string;
      if (existing) {
        taskId = existing.id;
      } else {
        const { data, error } = await this.supabase
          .from('maintenance_tasks')
          .insert({
            family_id: input.family_id,
            subsystem_id: input.bootstrap_subsystem_id,
            linked_procedure_id: proc.id,
            task_code: task.task_code.toLowerCase(),
            title: task.title,
            interval_type: task.interval_type || 'hours',
            interval_value: task.interval_value || 250,
            trigger_rule: task.trigger_rule,
            task_description: task.task_description,
            severity_if_skipped: task.severity_if_skipped || 'medium',
            official_source_document_id: input.source_document_id,
            official_source_page: task.source_page,
            official_source_snippet: task.source_snippet,
          })
          .select('id')
          .single();

        if (error || !data) { skipped++; continue; }
        taskId = data.id;
        created++;

        await this.evidenceService.createEvidence({
          family_id: input.family_id,
          object_type: 'maintenance_task',
          object_id: taskId,
          source_document_id: input.source_document_id,
          source_page: task.source_page,
          source_snippet: task.source_snippet,
          normalized_excerpt: task.task_description,
          evidence_role: 'primary',
          extraction_method: 'gemini_maintenance_extraction',
          confidence_score: 80,
        });
      }

      // Link parts to task
      if (task.part_numbers?.length > 0) {
        for (const pn of task.part_numbers) {
          const { data: part } = await this.supabase
            .from('parts')
            .select('id')
            .eq('family_id', input.family_id)
            .ilike('part_number', pn)
            .maybeSingle();

          if (!part) continue;
          await this.supabase
            .from('maintenance_task_parts')
            .upsert({
              maintenance_task_id: taskId!,
              part_id: part.id,
              requirement_kind: 'replacement',
              quantity_status: 'unknown_but_required',
              quantity_value: 0,
              unit: 'ea',
            }, { onConflict: 'maintenance_task_id,part_id' });
        }
      }
    }

    return { created, skipped, dqi };
  }

  private async extractFromText(text: string, procList: string, doc_id: string): Promise<RawMaintenanceTask[]> {
    const prompt = `
Extract maintenance tasks from this industrial maintenance manual.
Return ONLY a JSON array.

Available procedure codes in the database (use EXACTLY these codes for linked_procedure_code):
${procList || '  (none yet)'}

[{
  "task_code": "snake_case_unique",
  "title": "string",
  "interval_type": "daily|hours|days|weeks|months|years|event_based",
  "interval_value": number,
  "trigger_rule": "string describing when to do it",
  "task_description": "string",
  "severity_if_skipped": "low|medium|high|critical",
  "linked_procedure_code": "use one of the exact codes above, or empty string if none match",
  "source_page": number,
  "source_snippet": "exact quote",
  "part_numbers": ["part numbers used in this task"]
}]

Document:
${text}
`.trim();

    try {
      return await runGeminiJsonExtraction<RawMaintenanceTask[]>({
        model: DEFAULT_EXTRACTION_MODEL,
        prompt,
        extractor: 'MaintenanceExtractor',
        doc_id,
      });
    } catch {
      return [];
    }
  }
}
