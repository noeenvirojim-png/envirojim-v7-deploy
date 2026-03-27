/**
 * SubsystemExtractor — identifies real subsystems from document.
 * Upserts into subsystems table. Falls back to bootstrap subsystems if not found.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, MAX_CHUNK_CHARS } from '../modelConfig';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { EvidenceService } from '../services/EvidenceService';

export interface SubsystemExtractorInput {
  family_id: string;
  source_document_id: string;
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface RawSubsystem {
  subsystem_code: string;
  name: string;
  category: string;
  description: string;
  safety_critical: boolean;
  source_page: number;
  source_snippet: string;
}

export class SubsystemExtractor {
  private ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  private supabase = createAiCoreClient();
  private evidenceService = new EvidenceService();

  async extract(input: SubsystemExtractorInput): Promise<string[]> {
    const text = input.page_texts
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n')
      .slice(0, MAX_CHUNK_CHARS);

    const prompt = `
Extract machine subsystems from this industrial equipment document.
Return ONLY a JSON array. Each subsystem must appear in the document.
Use snake_case for subsystem_code. Include the exact page number and a 1–2 sentence snippet.

[{
  "subsystem_code": "string",
  "name": "string",
  "category": "string",
  "description": "string",
  "safety_critical": boolean,
  "source_page": number,
  "source_snippet": "exact quote from document"
}]

Document:
${text}
`.trim();

    const model = this.ai.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const extracted: RawSubsystem[] = JSON.parse(jsonMatch[0]);
    const upsertedIds: string[] = [];

    for (const sub of extracted) {
      if (!sub.subsystem_code?.trim() || !sub.name?.trim() || !sub.source_snippet?.trim()) continue;

      const { data: existing } = await this.supabase
        .from('subsystems')
        .select('id')
        .eq('family_id', input.family_id)
        .ilike('subsystem_code', sub.subsystem_code)
        .maybeSingle();

      let subsystemId: string;

      if (existing) {
        subsystemId = existing.id;
        // Update if bootstrap placeholder
        await this.supabase
          .from('subsystems')
          .update({
            name: sub.name,
            description: sub.description,
            safety_critical: sub.safety_critical,
            official_source_document_id: input.source_document_id,
            official_source_page: sub.source_page,
            official_source_snippet: sub.source_snippet,
          })
          .eq('id', subsystemId)
          .ilike('official_source_snippet', 'Bootstrap%');
      } else {
        const { data, error } = await this.supabase
          .from('subsystems')
          .insert({
            family_id: input.family_id,
            subsystem_code: sub.subsystem_code.toLowerCase(),
            name: sub.name,
            category: sub.category || 'system',
            description: sub.description,
            safety_critical: sub.safety_critical,
            diagnostic_priority_rank: 50,
            official_source_document_id: input.source_document_id,
            official_source_page: sub.source_page,
            official_source_snippet: sub.source_snippet,
          })
          .select('id')
          .single();

        if (error) continue;
        subsystemId = data.id;
      }

      await this.evidenceService.createEvidence({
        family_id: input.family_id,
        object_type: 'subsystem',
        object_id: subsystemId,
        source_document_id: input.source_document_id,
        source_page: sub.source_page,
        source_snippet: sub.source_snippet,
        normalized_excerpt: sub.description,
        evidence_role: 'primary',
        extraction_method: 'gemini_extraction',
        confidence_score: 80,
      });

      upsertedIds.push(subsystemId);
    }

    return upsertedIds;
  }
}
