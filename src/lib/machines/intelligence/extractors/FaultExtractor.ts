/**
 * FaultExtractor — extracts fault_symptoms, fault_causes, diagnostic_tests,
 * and diagnostic_links from faults_and_remedy / troubleshooting documents.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, MAX_CHUNK_CHARS } from '../modelConfig';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { EvidenceService } from '../services/EvidenceService';

export interface FaultExtractorInput {
  family_id: string;
  source_document_id: string;
  bootstrap_subsystem_id: string;
  page_texts: Array<{ pageNumber: number; text: string }>;
}

interface RawFaultCase {
  symptom_code: string;
  symptom_title: string;
  normalized_symptom: string;
  symptom_type: string;
  severity_default: string;
  stoppage_risk: string;
  safety_risk: string;
  operator_wording_examples: string[];
  source_page: number;
  source_snippet: string;
  causes: Array<{
    cause_code: string;
    title: string;
    description: string;
    cause_type: string;
    confirmatory_signs: string[];
    disconfirming_signs: string[];
    test_code?: string;
    test_title?: string;
    test_purpose?: string;
    likelihood_rank: number;
    documentary_confidence: number;
  }>;
}

export class FaultExtractor {
  private ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  private supabase = createAiCoreClient();
  private evidenceService = new EvidenceService();

  async extract(input: FaultExtractorInput): Promise<{ symptoms: number; causes: number; links: number }> {
    const text = input.page_texts
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n')
      .slice(0, MAX_CHUNK_CHARS);

    const cases = await this.extractFromText(text);
    let symptomCount = 0, causeCount = 0, linkCount = 0;

    for (const fc of cases) {
      if (!fc.symptom_code?.trim() || !fc.source_snippet?.trim()) continue;

      // Upsert symptom
      const { data: existingSym } = await this.supabase
        .from('fault_symptoms')
        .select('id')
        .eq('family_id', input.family_id)
        .ilike('symptom_code', fc.symptom_code)
        .maybeSingle();

      let symptomId: string;
      if (existingSym) {
        symptomId = existingSym.id;
      } else {
        const { data, error } = await this.supabase
          .from('fault_symptoms')
          .insert({
            family_id: input.family_id,
            subsystem_id: input.bootstrap_subsystem_id,
            symptom_code: fc.symptom_code.toLowerCase(),
            title: fc.symptom_title,
            normalized_symptom: fc.normalized_symptom.toLowerCase(),
            symptom_type: fc.symptom_type || 'mechanical',
            operator_wording_examples_json: fc.operator_wording_examples ?? [],
            severity_default: fc.severity_default || 'medium',
            stoppage_risk: fc.stoppage_risk || 'medium',
            safety_risk: fc.safety_risk || 'low',
            official_source_document_id: input.source_document_id,
            official_source_page: fc.source_page,
            official_source_snippet: fc.source_snippet,
          })
          .select('id')
          .single();

        if (error) continue;
        symptomId = data.id;
        symptomCount++;

        await this.evidenceService.createEvidence({
          family_id: input.family_id,
          object_type: 'fault_symptom',
          object_id: symptomId,
          source_document_id: input.source_document_id,
          source_page: fc.source_page,
          source_snippet: fc.source_snippet,
          normalized_excerpt: fc.normalized_symptom,
          evidence_role: 'primary',
          extraction_method: 'gemini_fault_extraction',
          confidence_score: 85,
        });
      }

      for (const cause of fc.causes ?? []) {
        if (!cause.cause_code?.trim()) continue;

        // Upsert diagnostic test if provided
        let testId: string | null = null;
        if (cause.test_code?.trim()) {
          const { data: existingTest } = await this.supabase
            .from('diagnostic_tests')
            .select('id')
            .eq('family_id', input.family_id)
            .ilike('test_code', cause.test_code)
            .maybeSingle();

          if (existingTest) {
            testId = existingTest.id;
          } else {
            const { data: td } = await this.supabase
              .from('diagnostic_tests')
              .insert({
                family_id: input.family_id,
                subsystem_id: input.bootstrap_subsystem_id,
                test_code: cause.test_code.toLowerCase(),
                title: cause.test_title || cause.test_code,
                test_purpose: cause.test_purpose || 'Verify cause',
                expected_outcomes_summary: 'See procedure',
                interpretation_rules_summary: 'See procedure',
                safety_notes: 'Follow machine safety protocols',
                official_source_document_id: input.source_document_id,
                official_source_page: fc.source_page,
                official_source_snippet: fc.source_snippet,
              })
              .select('id')
              .single();
            if (td) testId = td.id;
          }
        }

        // Upsert cause
        const { data: existingCause } = await this.supabase
          .from('fault_causes')
          .select('id')
          .eq('family_id', input.family_id)
          .ilike('cause_code', cause.cause_code)
          .maybeSingle();

        let causeId: string;
        if (existingCause) {
          causeId = existingCause.id;
        } else {
          const { data: cd, error } = await this.supabase
            .from('fault_causes')
            .insert({
              family_id: input.family_id,
              subsystem_id: input.bootstrap_subsystem_id,
              cause_code: cause.cause_code.toLowerCase(),
              title: cause.title,
              description: cause.description,
              cause_type: cause.cause_type || 'mechanical',
              confirmatory_signs_json: cause.confirmatory_signs ?? [],
              disconfirming_signs_json: cause.disconfirming_signs ?? [],
              official_source_document_id: input.source_document_id,
              official_source_page: fc.source_page,
              official_source_snippet: fc.source_snippet,
            })
            .select('id')
            .single();

          if (error || !cd) continue;
          causeId = cd.id;
          causeCount++;
        }

        // Create diagnostic_link if test exists
        if (testId) {
          const { data: existingLink } = await this.supabase
            .from('diagnostic_links')
            .select('id')
            .eq('symptom_id', symptomId)
            .eq('cause_id', causeId)
            .maybeSingle();

          if (!existingLink) {
            const { data: ld } = await this.supabase
              .from('diagnostic_links')
              .insert({
                family_id: input.family_id,
                symptom_id: symptomId,
                cause_id: causeId,
                primary_test_id: testId,
                likelihood_rank: cause.likelihood_rank || 1,
                documentary_confidence: cause.documentary_confidence || 75,
                conditions_json: [],
                recommended_first_checks_json: cause.confirmatory_signs ?? [],
                official_source_document_id: input.source_document_id,
                official_source_page: fc.source_page,
                official_source_snippet: fc.source_snippet,
              })
              .select('id')
              .single();

            if (ld) {
              linkCount++;
              await this.evidenceService.createEvidence({
                family_id: input.family_id,
                object_type: 'diagnostic_link',
                object_id: ld.id,
                source_document_id: input.source_document_id,
                source_page: fc.source_page,
                source_snippet: fc.source_snippet,
                normalized_excerpt: `${fc.normalized_symptom} → ${cause.description}`,
                evidence_role: 'primary',
                extraction_method: 'gemini_fault_extraction',
                confidence_score: cause.documentary_confidence || 75,
              });
            }
          }
        }
      }
    }

    return { symptoms: symptomCount, causes: causeCount, links: linkCount };
  }

  private async extractFromText(text: string): Promise<RawFaultCase[]> {
    const prompt = `
Extract fault cases from this industrial troubleshooting document.
Return ONLY a JSON array.

[{
  "symptom_code": "snake_case_unique",
  "symptom_title": "string",
  "normalized_symptom": "lowercase description",
  "symptom_type": "mechanical|electrical|hydraulic|thermal|control|other",
  "severity_default": "low|medium|high|critical",
  "stoppage_risk": "none|low|medium|high|critical",
  "safety_risk": "none|low|medium|high|critical",
  "operator_wording_examples": ["string"],
  "source_page": number,
  "source_snippet": "exact quote",
  "causes": [{
    "cause_code": "snake_case_unique",
    "title": "string",
    "description": "string",
    "cause_type": "mechanical|electrical|hydraulic|thermal|control|other",
    "confirmatory_signs": ["string"],
    "disconfirming_signs": ["string"],
    "test_code": "optional_snake_case",
    "test_title": "optional string",
    "test_purpose": "optional string",
    "likelihood_rank": number,
    "documentary_confidence": number (0-100)
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
