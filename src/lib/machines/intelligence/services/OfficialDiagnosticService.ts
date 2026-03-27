/**
 * ENVIROJIM — OfficialDiagnosticService
 * Level 1: official documented answers only.
 * Queries fault_symptoms → diagnostic_links → causes / tests / parts.
 * Never mixes inferred content. Returns found=false if no match.
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import { MachineKnowledgeRepository } from '../repositories/MachineKnowledgeRepository';
import { EvidenceService } from './EvidenceService';
import { filterRealEvidence } from '../guards/syntheticGuard';
import type {
  OfficialDocumentedAnswer, OfficialDocumentedAnswerEmpty,
  CandidatePart, EvidenceRef,
} from '../contracts';

export class OfficialDiagnosticService {
  private repo = new MachineKnowledgeRepository();
  private evidenceService = new EvidenceService();
  private supabase = createAiCoreClient();

  async query(
    familyId: string,
    normalizedProblem: string,
  ): Promise<OfficialDocumentedAnswer | OfficialDocumentedAnswerEmpty> {
    // 1. Search symptoms
    const symptoms = await this.repo.searchFaultSymptoms(familyId, normalizedProblem);

    if (symptoms.length === 0) {
      return { found: false, no_official_machine_answer_found: true };
    }

    // 2. For each symptom, get diagnostic links (ranked by likelihood)
    const allLinks: any[] = [];
    for (const symptom of symptoms) {
      const links = await this.repo.getDiagnosticLinksForSymptom(symptom.id);
      allLinks.push(...links.map(l => ({ ...l, symptom })));
    }

    if (allLinks.length === 0) {
      return { found: false, no_official_machine_answer_found: true };
    }

    // 3. Aggregate results
    const affectedSubsystemIds = new Set<string>();
    const causeCodes: string[] = [];
    const recommendedTests: string[] = [];
    const recommendedProcedures: string[] = [];
    const candidateParts: CandidatePart[] = [];
    const evidenceRefs: EvidenceRef[] = [];
    let totalConfidence = 0;

    for (const link of allLinks) {
      affectedSubsystemIds.add(link.family_id); // will map to subsystem below

      if (link.fault_causes?.cause_code) {
        causeCodes.push(link.fault_causes.cause_code);
      }
      if (link.diagnostic_tests?.test_code) {
        recommendedTests.push(link.diagnostic_tests.test_code);
      }

      // Procedures linked to this diagnostic link
      const procedures = (link.diagnostic_link_procedures ?? [])
        .sort((a: any, b: any) => a.ranking - b.ranking)
        .map((p: any) => p.procedures?.procedure_code)
        .filter(Boolean);
      recommendedProcedures.push(...procedures);

      // Parts linked to this diagnostic link (official_confirmed only for safe ordering)
      const parts = (link.diagnostic_link_parts ?? [])
        .sort((a: any, b: any) => a.ranking - b.ranking)
        .filter((p: any) => p.parts)
        .map((p: any) => {
          const part = p.parts;
          const whatToConfirm: string[] = [];
          if (part.order_safety_status === 'requires_visual_confirmation') {
            whatToConfirm.push('Confirm part visually on machine before ordering');
          }
          if (part.order_safety_status === 'requires_serial_or_position_confirmation') {
            whatToConfirm.push('Confirm serial number and position label before ordering');
          }

          return {
            part,
            order_safety_status: part.order_safety_status,
            what_to_confirm_before_order: whatToConfirm,
            evidence: [],
          } as CandidatePart;
        });
      candidateParts.push(...parts);

      // Evidence for the diagnostic link
      const linkEvidence = await this.evidenceService.getForObject('diagnostic_link', link.id);
      evidenceRefs.push(...linkEvidence);

      // Also pull from the symptom source
      if (link.symptom?.official_source_document_id) {
        evidenceRefs.push({
          source_document_id: link.symptom.official_source_document_id,
          source_page: link.symptom.official_source_page,
          source_snippet: link.symptom.official_source_snippet,
          normalized_excerpt: link.symptom.normalized_symptom,
          evidence_role: 'symptom_match',
          extraction_method: 'db_lookup',
          confidence_score: link.documentary_confidence,
        });
      }

      totalConfidence += link.documentary_confidence ?? 0;
    }

    // Deduplicate
    const uniqueCauses = [...new Set(causeCodes)];
    const uniqueTests = [...new Set(recommendedTests)];
    const uniqueProcedures = [...new Set(recommendedProcedures)];
    const avgConfidence = Math.round(totalConfidence / allLinks.length);

    // SYNTHETIC GUARD: load synthetic doc ids for this family and filter evidence
    const { data: syntheticDocs } = await this.supabase
      .from('source_documents')
      .select('id')
      .eq('family_id', familyId)
      .eq('is_synthetic', true);
    const syntheticIds = new Set((syntheticDocs ?? []).map((d: any) => d.id));
    const realEvidenceRefs = filterRealEvidence(evidenceRefs, syntheticIds);

    // Resolve subsystem names
    const subsystems = await this.repo.getSubsystemsByFamily(familyId);
    const affectedSubsystemNames = subsystems
      .filter(s => allLinks.some(l => l.symptom?.subsystem_id === s.id))
      .map(s => s.name);

    // If all evidence was synthetic → no real official answer
    if (realEvidenceRefs.length === 0 && evidenceRefs.length > 0) {
      return { found: false, no_official_machine_answer_found: true };
    }

    return {
      found: true,
      affected_subsystems: affectedSubsystemNames,
      summary: `Found ${allLinks.length} diagnostic link(s) matching "${normalizedProblem}"`,
      cause_codes: uniqueCauses,
      recommended_tests: uniqueTests,
      recommended_procedures: uniqueProcedures,
      candidate_parts: candidateParts,
      evidence: realEvidenceRefs,
      documentary_confidence: avgConfidence,
    };
  }
}
