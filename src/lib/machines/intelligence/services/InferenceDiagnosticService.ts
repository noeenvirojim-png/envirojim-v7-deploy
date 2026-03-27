/**
 * ENVIROJIM — InferenceDiagnosticService
 * Level 3: inferred non-official answer.
 * Only called when official answer is absent or partial.
 * MANDATORY: always includes the disclaimer. Never returns part numbers. Never safe_to_order.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL } from '../modelConfig';
import { MachineKnowledgeRepository } from '../repositories/MachineKnowledgeRepository';
import {
  INFERRED_DISCLAIMER,
  type InferredNonOfficialAnswer,
} from '../contracts';

export class InferenceDiagnosticService {
  private repo = new MachineKnowledgeRepository();
  private ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

  async infer(
    familyId: string,
    normalizedProblem: string,
    officialContext: string,
  ): Promise<InferredNonOfficialAnswer> {
    // Check inference policy
    const policy = await this.repo.getInferencePolicy(familyId);
    if (policy && !policy.allow_non_official_inference) {
      return {
        disclaimer: INFERRED_DISCLAIMER,
        summary: 'Inference is disabled for this machine family per policy.',
        inferred_causes: [],
        inferred_parts: [],
        inferred_procedures: [],
        confidence_note: 'inference_disabled_by_policy',
      };
    }

    const family = await this.repo.getFamilyById(familyId);
    const subsystems = await this.repo.getSubsystemsByFamily(familyId);
    const subsystemList = subsystems.map(s => s.name).join(', ');

    const prompt = `
You are an industrial machine expert AI for ENVIROJIM.
Machine family: ${family?.brand ?? 'unknown'} ${family?.model ?? 'unknown'}
Subsystems available: ${subsystemList}

Problem reported: ${normalizedProblem}

Official documented context (may be empty):
${officialContext || 'None found in documentation.'}

IMPORTANT RULES:
- You are providing a NON-OFFICIAL inference. This is NOT from the machine documentation.
- Do NOT provide part numbers. Only provide part type/category names.
- Do NOT say anything is "safe to order".
- Be concise and precise.

Respond in JSON with this exact structure:
{
  "summary": "brief explanation",
  "inferred_causes": ["cause 1", "cause 2"],
  "inferred_parts": ["part type name only — no numbers"],
  "inferred_procedures": ["procedure description"],
  "confidence_note": "why this is uncertain"
}
`.trim();

    try {
      const model = this.ai.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in Gemini response');

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        disclaimer: INFERRED_DISCLAIMER,
        summary: String(parsed.summary ?? ''),
        inferred_causes: Array.isArray(parsed.inferred_causes) ? parsed.inferred_causes.map(String) : [],
        inferred_parts: Array.isArray(parsed.inferred_parts) ? parsed.inferred_parts.map(String) : [],
        inferred_procedures: Array.isArray(parsed.inferred_procedures) ? parsed.inferred_procedures.map(String) : [],
        confidence_note: String(parsed.confidence_note ?? 'AI inference — not verified against documentation'),
      };
    } catch (err) {
      return {
        disclaimer: INFERRED_DISCLAIMER,
        summary: 'Could not generate inference at this time.',
        inferred_causes: [],
        inferred_parts: [],
        inferred_procedures: [],
        confidence_note: `inference_error: ${err instanceof Error ? err.message : 'unknown'}`,
      };
    }
  }
}
