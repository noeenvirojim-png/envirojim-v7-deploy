/**
 * ProcedureExtractor — extracts procedures + steps from maintenance/operating manuals.
 */

import { MAX_CHUNK_CHARS } from '../modelConfig';
import { DEFAULT_EXTRACTION_MODEL } from '../config/geminiConfig';
import { runGeminiJsonExtraction } from '../clients/geminiClient';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { EvidenceService } from '../services/EvidenceService';

export interface ProcedureExtractorInput {
  family_id: string;
  source_document_id: string;
  bootstrap_subsystem_id: string;
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface RawStep {
  step_no: number;
  instruction: string;
  expected_result: string;
  safety_note: string;
}

interface RawProcedure {
  procedure_code: string;
  title: string;
  procedure_type: string;
  purpose: string;
  prerequisites: string;
  safety_notes: string;
  tools_required: string;
  completion_criteria: string;
  source_page: number;
  source_snippet: string;
  steps: RawStep[];
}

export class ProcedureExtractor {
  private supabase = createAiCoreClient();
  private evidenceService = new EvidenceService();

  async extract(input: ProcedureExtractorInput): Promise<number> {
    const text = input.page_texts
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n')
      .slice(0, MAX_CHUNK_CHARS);

    const procedures = await this.extractFromText(text, input.source_document_id);
    let count = 0;

    for (const proc of procedures) {
      if (!proc.procedure_code?.trim() || !proc.title?.trim() || !proc.source_snippet?.trim()) continue;

      const { data: existing } = await this.supabase
        .from('procedures')
        .select('id')
        .eq('family_id', input.family_id)
        .ilike('procedure_code', proc.procedure_code)
        .maybeSingle();

      let procedureId: string;

      if (existing) {
        procedureId = existing.id;
      } else {
        const { data, error } = await this.supabase
          .from('procedures')
          .insert({
            family_id: input.family_id,
            subsystem_id: input.bootstrap_subsystem_id,
            procedure_code: proc.procedure_code.toLowerCase(),
            title: proc.title,
            procedure_type: proc.procedure_type || 'other',
            purpose: proc.purpose || proc.title,
            prerequisites: proc.prerequisites || 'none',
            safety_notes: proc.safety_notes || 'none',
            tools_required: proc.tools_required || 'none',
            completion_criteria: proc.completion_criteria || 'procedure complete',
            official_source_document_id: input.source_document_id,
            official_source_page: proc.source_page,
            official_source_snippet: proc.source_snippet,
          })
          .select('id')
          .single();

        if (error) continue;
        procedureId = data.id;

        // Insert steps
        if (proc.steps?.length > 0) {
          const stepRows = proc.steps.map(s => ({
            procedure_id: procedureId,
            step_no: s.step_no,
            instruction: s.instruction,
            expected_result: s.expected_result || 'step complete',
            safety_note: s.safety_note || '',
          }));
          await this.supabase.from('procedure_steps').insert(stepRows);
        }
      }

      await this.evidenceService.createEvidence({
        family_id: input.family_id,
        object_type: 'procedure',
        object_id: procedureId,
        source_document_id: input.source_document_id,
        source_page: proc.source_page,
        source_snippet: proc.source_snippet,
        normalized_excerpt: proc.purpose,
        evidence_role: 'primary',
        extraction_method: 'gemini_procedure_extraction',
        confidence_score: 80,
      });

      count++;
    }

    return count;
  }

  private async extractFromText(text: string, doc_id: string): Promise<RawProcedure[]> {
    const prompt = `
Extract maintenance/operating procedures from this industrial document.
Return ONLY a JSON array.

[{
  "procedure_code": "unique_snake_case_code",
  "title": "string",
  "procedure_type": "startup|shutdown|cleaning|inspection|troubleshooting|replacement|maintenance|emergency|configuration|other",
  "purpose": "string",
  "prerequisites": "string",
  "safety_notes": "string",
  "tools_required": "string",
  "completion_criteria": "string",
  "source_page": number,
  "source_snippet": "exact quote",
  "steps": [{ "step_no": 1, "instruction": "string", "expected_result": "string", "safety_note": "string" }]
}]

Document:
${text}
`.trim();

    try {
      return await runGeminiJsonExtraction<RawProcedure[]>({
        model: DEFAULT_EXTRACTION_MODEL,
        prompt,
        extractor: 'ProcedureExtractor',
        doc_id,
      });
    } catch {
      return [];
    }
  }
}
