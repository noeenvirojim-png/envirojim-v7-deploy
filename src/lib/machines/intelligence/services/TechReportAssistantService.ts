/**
 * ENVIROJIM — TechReportAssistantService
 * Builds structured BT / service report output.
 * Pulls official diagnostic links for evidence-backed findings.
 * Parts used/recommended only from official_confirmed with order_safety_status.
 */

import { OfficialDiagnosticService } from './OfficialDiagnosticService';
import { EvidenceService } from './EvidenceService';
import type { TechReportOutput, CandidatePart, EvidenceRef } from '../contracts';

export interface TechReportInput {
  family_id: string;
  symptom_observed: string;
  conditions_of_occurrence: string;
  tests_performed: string[];
  findings: string;
  probable_cause: string;
  confirmed: boolean;
  action_taken: string;
  parts_used_ids: string[];    // part IDs already used
  follow_up: string;
}

export class TechReportAssistantService {
  private officialDiagnostic = new OfficialDiagnosticService();
  private evidenceService = new EvidenceService();

  async buildReport(input: TechReportInput): Promise<TechReportOutput> {
    // Pull official diagnostic context for evidence
    const officialAnswer = await this.officialDiagnostic.query(
      input.family_id,
      input.symptom_observed,
    );

    const evidence: EvidenceRef[] = officialAnswer.found ? officialAnswer.evidence : [];
    const partsRecommended: CandidatePart[] =
      officialAnswer.found ? officialAnswer.candidate_parts : [];

    // Parts used: if we have their IDs, pull them (simplified — caller provides pre-resolved parts)
    // In a full implementation this would query parts by ID
    const partsUsed: CandidatePart[] = [];

    return {
      symptom_observed: input.symptom_observed,
      conditions_of_occurrence: input.conditions_of_occurrence,
      tests_performed: input.tests_performed,
      findings: input.findings,
      probable_cause: input.probable_cause,
      confirmed_or_not_confirmed: input.confirmed ? 'confirmed' : 'not_confirmed',
      action_taken: input.action_taken,
      parts_used: partsUsed,
      parts_recommended: partsRecommended,
      follow_up: input.follow_up,
      evidence,
    };
  }
}
