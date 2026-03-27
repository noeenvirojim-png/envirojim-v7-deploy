/**
 * ChecklistExtractor — extracts checklist_templates and checklist_items.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, MAX_CHUNK_CHARS } from '../modelConfig';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { EvidenceService } from '../services/EvidenceService';

export interface ChecklistExtractorInput {
  family_id: string;
  source_document_id: string;
  bootstrap_subsystem_id: string;
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface RawChecklistItem {
  item_no: number;
  item_text: string;
  reason_text: string;
  expected_result: string;
  action_if_fail: string;
  source_page: number;
  source_snippet: string;
}

interface RawChecklist {
  template_code: string;
  title: string;
  audience: string;
  checklist_type: string;
  trigger_rule: string;
  source_page: number;
  source_snippet: string;
  items: RawChecklistItem[];
}

export class ChecklistExtractor {
  private ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  private supabase = createAiCoreClient();
  private evidenceService = new EvidenceService();

  async extract(input: ChecklistExtractorInput): Promise<number> {
    const text = input.page_texts
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n')
      .slice(0, MAX_CHUNK_CHARS);

    const checklists = await this.extractFromText(text);
    let count = 0;

    for (const cl of checklists) {
      if (!cl.template_code?.trim() || !cl.source_snippet?.trim()) continue;

      const { data: existing } = await this.supabase
        .from('checklist_templates')
        .select('id')
        .eq('family_id', input.family_id)
        .ilike('template_code', cl.template_code)
        .maybeSingle();

      let templateId: string;
      if (existing) {
        templateId = existing.id;
      } else {
        const { data, error } = await this.supabase
          .from('checklist_templates')
          .insert({
            family_id: input.family_id,
            subsystem_id: input.bootstrap_subsystem_id,
            template_code: cl.template_code.toLowerCase(),
            title: cl.title,
            audience: cl.audience || 'operator',
            checklist_type: cl.checklist_type || 'daily_operator',
            trigger_rule: cl.trigger_rule || 'daily',
            official_source_document_id: input.source_document_id,
            official_source_page: cl.source_page,
            official_source_snippet: cl.source_snippet,
          })
          .select('id')
          .single();

        if (error || !data) continue;
        templateId = data.id;
        count++;

        // Insert items
        for (const item of cl.items ?? []) {
          if (!item.item_text?.trim()) continue;
          const { data: itemData } = await this.supabase
            .from('checklist_items')
            .insert({
              checklist_template_id: templateId,
              item_no: item.item_no,
              item_text: item.item_text,
              reason_text: item.reason_text || 'Required check',
              expected_result: item.expected_result || 'OK',
              action_if_fail: item.action_if_fail || 'Stop machine and report',
              official_source_document_id: input.source_document_id,
              official_source_page: item.source_page,
              official_source_snippet: item.source_snippet,
            })
            .select('id')
            .single();

          if (itemData) {
            await this.evidenceService.createEvidence({
              family_id: input.family_id,
              object_type: 'checklist_item',
              object_id: itemData.id,
              source_document_id: input.source_document_id,
              source_page: item.source_page,
              source_snippet: item.source_snippet,
              normalized_excerpt: item.item_text,
              evidence_role: 'primary',
              extraction_method: 'gemini_checklist_extraction',
              confidence_score: 80,
            });
          }
        }
      }
    }

    return count;
  }

  private async extractFromText(text: string): Promise<RawChecklist[]> {
    const prompt = `
Extract operator/technician checklists from this industrial document.
Return ONLY a JSON array.

[{
  "template_code": "snake_case_unique",
  "title": "string",
  "audience": "operator|technician|internal|customer",
  "checklist_type": "daily_operator|daily_technician|startup|shutdown|pre_delivery|after_maintenance|safety|custom",
  "trigger_rule": "string",
  "source_page": number,
  "source_snippet": "exact quote",
  "items": [{
    "item_no": number,
    "item_text": "string",
    "reason_text": "string",
    "expected_result": "string",
    "action_if_fail": "string",
    "source_page": number,
    "source_snippet": "exact quote"
  }]
}]

Document:
${text}
`.trim();

    try {
      const model = this.ai.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      return JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }
}
