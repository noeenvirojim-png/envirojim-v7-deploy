/**
 * PartExtractor — extracts parts from spare_parts_list / parts catalog pages.
 * Rules enforced:
 * - No part without part_number → blocked_incomplete + data_quality_issue
 * - No part without doc/page/snippet → blocked_incomplete + data_quality_issue
 * - All parts written with order_safety_status from PartValidationService
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, MAX_CHUNK_CHARS } from '../modelConfig';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { PartValidationService } from '../services/PartValidationService';
import { EvidenceService } from '../services/EvidenceService';

export interface PartExtractorInput {
  family_id: string;
  source_document_id: string;
  bootstrap_subsystem_id: string;   // fallback subsystem
  bootstrap_assembly_id: string;    // fallback assembly
  bootstrap_component_id: string;   // fallback component
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface RawPart {
  part_number: string;
  part_name: string;
  part_type: string;
  is_wear_part: boolean;
  is_consumable: boolean;
  quantity_value: number;
  quantity_status: 'exact' | 'estimated' | 'unknown_but_required';
  unit: string;
  source_page: number;
  source_snippet: string;
}

export class PartExtractor {
  private ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  private supabase = createAiCoreClient();
  private validator = new PartValidationService();
  private evidenceService = new EvidenceService();

  async extract(input: PartExtractorInput): Promise<{ inserted: number; blocked: number }> {
    let totalInserted = 0;
    let totalBlocked = 0;

    // Process in chunks
    const CHUNK = MAX_CHUNK_CHARS;
    const chunks: Array<typeof input.page_texts> = [];
    let current: typeof input.page_texts = [];
    let currentLen = 0;

    for (const page of input.page_texts) {
      if (currentLen + page.text.length > CHUNK && current.length > 0) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(page);
      currentLen += page.text.length;
    }
    if (current.length > 0) chunks.push(current);

    for (const chunk of chunks) {
      const text = chunk.map(p => `[PAGE ${p.pageNumber}]\n${p.text}`).join('\n\n');
      const parts = await this.extractChunk(text);

      for (const p of parts) {
        const { id, blocked } = await this.validator.upsertPart({
          family_id: input.family_id,
          subsystem_id: input.bootstrap_subsystem_id,
          primary_assembly_id: input.bootstrap_assembly_id,
          primary_component_id: input.bootstrap_component_id,
          part_number: p.part_number,
          part_name: p.part_name,
          normalized_part_name: p.part_name.toLowerCase().replace(/\s+/g, '_'),
          part_type: p.part_type || 'unknown',
          is_wear_part: p.is_wear_part,
          is_consumable: p.is_consumable,
          quantity_status: p.quantity_status,
          quantity_value: p.quantity_value,
          unit: p.unit || 'ea',
          official_source_document_id: input.source_document_id,
          official_source_page: p.source_page,
          official_source_snippet: p.source_snippet,
          official_evidence_confidence: 75,
        });

        if (blocked) {
          totalBlocked++;
          continue;
        }

        await this.evidenceService.createEvidence({
          family_id: input.family_id,
          object_type: 'part',
          object_id: id,
          source_document_id: input.source_document_id,
          source_page: p.source_page,
          source_snippet: p.source_snippet,
          normalized_excerpt: `${p.part_number} — ${p.part_name}`,
          evidence_role: 'primary',
          extraction_method: 'gemini_parts_extraction',
          confidence_score: 75,
        });

        totalInserted++;
      }
    }

    return { inserted: totalInserted, blocked: totalBlocked };
  }

  private async extractChunk(text: string): Promise<RawPart[]> {
    const prompt = `
Extract all parts from this industrial spare parts list.
Return ONLY a JSON array. Include page number and exact snippet for each part.
If part_number is missing, set it to empty string "".

[{
  "part_number": "string (empty if not found)",
  "part_name": "string",
  "part_type": "string (filter|seal|bearing|shaft|belt|pump|motor|sensor|other)",
  "is_wear_part": boolean,
  "is_consumable": boolean,
  "quantity_value": number,
  "quantity_status": "exact|estimated|unknown_but_required",
  "unit": "ea|L|kg|m|set",
  "source_page": number,
  "source_snippet": "exact 1-2 line quote from document showing this part"
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
