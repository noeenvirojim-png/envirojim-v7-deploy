/**
 * FamilyProfileExtractor — extracts machine family identity fields from document text.
 * Updates machine_families if fields are still at default 'not_in_source_document'.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '../modelConfig';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';

export interface FamilyProfileInput {
  family_id: string;
  source_document_id: string;
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface ExtractedProfile {
  manufacturer?: string;
  brand?: string;
  model?: string;
  variant?: string;
  description?: string;
  engine_model?: string;
  power_kw?: number;
  operating_weight_kg?: number;
  intended_use_summary?: string;
  forbidden_use_summary?: string;
  ambient_operating_limits?: string;
}

export class FamilyProfileExtractor {
  private ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  private supabase = createAiCoreClient();

  async extract(input: FamilyProfileInput): Promise<ExtractedProfile> {
    // Use first 5 pages — identity info typically in front matter
    const text = input.page_texts.slice(0, 5)
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n');

    const prompt = `
Extract machine identity from this technical document excerpt.
Return ONLY JSON. Use null for any field not found in the text.

{
  "manufacturer": string|null,
  "brand": string|null,
  "model": string|null,
  "variant": string|null,
  "description": string|null,
  "engine_model": string|null,
  "power_kw": number|null,
  "operating_weight_kg": number|null,
  "intended_use_summary": string|null,
  "forbidden_use_summary": string|null,
  "ambient_operating_limits": string|null
}

Document:
${text.slice(0, 8000)}
`.trim();

    const model = this.ai.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const extracted: ExtractedProfile = JSON.parse(jsonMatch[0]);

    // Update family only for fields still at default
    const { data: family } = await this.supabase
      .from('machine_families')
      .select('*')
      .eq('id', input.family_id)
      .single();

    if (!family) return extracted;

    const updates: Record<string, any> = {};
    const defaults = ['not_in_source_document', 'unknown_but_required'];

    const fields: Array<keyof ExtractedProfile> = [
      'manufacturer', 'brand', 'model', 'variant', 'description',
      'engine_model', 'intended_use_summary', 'forbidden_use_summary', 'ambient_operating_limits',
    ];

    for (const field of fields) {
      const current = family[field];
      const extracted_val = extracted[field];
      if (extracted_val && defaults.includes(current)) {
        updates[field] = extracted_val;
      }
    }

    if (extracted.power_kw && family.power_kw === 0) updates.power_kw = extracted.power_kw;
    if (extracted.operating_weight_kg && family.operating_weight_kg === 0) {
      updates.operating_weight_kg = extracted.operating_weight_kg;
    }

    if (Object.keys(updates).length > 0) {
      await this.supabase
        .from('machine_families')
        .update(updates)
        .eq('id', input.family_id);
    }

    return extracted;
  }
}
