/**
 * ENVIROJIM — PartsAssistantService
 * Rules:
 * - No part number → no official part
 * - order_safety_status is always worst-case aggregate of candidate parts
 * - safe_to_order only if all candidates are official_confirmed
 * - Always includes what_to_confirm_before_order
 * - If no official part found: no_official_part_found=true + inferred block (names only)
 */

import { MachineKnowledgeRepository } from '../repositories/MachineKnowledgeRepository';
import { InferenceDiagnosticService } from './InferenceDiagnosticService';
import { EvidenceService } from './EvidenceService';
import { filterRealEvidence } from '../guards/syntheticGuard';
import {
  INFERRED_DISCLAIMER,
  type PartsAssistantOutput, type CandidatePart, type OrderSafetyStatus,
} from '../contracts';
import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';

const SAFETY_RANK: Record<OrderSafetyStatus, number> = {
  safe_to_order: 0,
  requires_visual_confirmation: 1,
  requires_serial_or_position_confirmation: 2,
  not_safe_to_order: 3,
};

function worstSafetyStatus(parts: CandidatePart[]): OrderSafetyStatus {
  if (parts.length === 0) return 'not_safe_to_order';
  return parts.reduce((worst, p) => {
    return SAFETY_RANK[p.order_safety_status] > SAFETY_RANK[worst]
      ? p.order_safety_status
      : worst;
  }, 'safe_to_order' as OrderSafetyStatus);
}

export class PartsAssistantService {
  private repo = new MachineKnowledgeRepository();
  private evidenceService = new EvidenceService();
  private inferenceService = new InferenceDiagnosticService();
  private supabase = createAiCoreClient();

  async query(familyId: string, partQuery: string): Promise<PartsAssistantOutput> {
    // 1. Try exact part number match
    const exactPart = await this.repo.getPartByNumber(familyId, partQuery);
    const candidateParts: CandidatePart[] = [];

    if (exactPart) {
      const evidence = await this.evidenceService.getForObject('part', exactPart.id);
      const whatToConfirm = this.buildWhatToConfirm(exactPart);
      candidateParts.push({
        part: exactPart,
        order_safety_status: exactPart.order_safety_status,
        what_to_confirm_before_order: whatToConfirm,
        evidence,
      });
    } else {
      // 2. Fuzzy search by name across all official confirmed parts
      const allParts = await this.repo.getOfficialConfirmedParts(familyId);
      const query = partQuery.toLowerCase();
      const matched = allParts.filter(p =>
        p.part_name.toLowerCase().includes(query) ||
        p.part_number.toLowerCase().includes(query)
      );

      const evidenceMap = await this.evidenceService.getForObjects(
        'part',
        matched.map(p => p.id),
      );

      for (const part of matched.slice(0, 5)) {
        candidateParts.push({
          part,
          order_safety_status: part.order_safety_status,
          what_to_confirm_before_order: this.buildWhatToConfirm(part),
          evidence: evidenceMap[part.id] ?? [],
        });
      }
    }

    // SYNTHETIC GUARD: load synthetic doc ids, filter evidence, strip safe_to_order from synthetic-sourced parts
    const { data: syntheticDocs } = await this.supabase
      .from('source_documents')
      .select('id')
      .eq('family_id', familyId)
      .eq('is_synthetic', true);
    const syntheticIds = new Set((syntheticDocs ?? []).map((d: any) => d.id));

    for (const cp of candidateParts) {
      // Filter evidence to real only
      cp.evidence = filterRealEvidence(cp.evidence, syntheticIds);
      // If this part's official source is synthetic, demote to not_safe_to_order
      const partSource = (cp.part as any).official_source_document_id;
      if (partSource && syntheticIds.has(partSource)) {
        cp.order_safety_status = 'not_safe_to_order';
        cp.what_to_confirm_before_order = [
          'Part source is a bootstrap placeholder — not safe to order without real document confirmation',
        ];
      }
    }

    // Remove candidates that have no real evidence and source is synthetic
    const realCandidates = candidateParts.filter(cp => {
      const partSource = (cp.part as any).official_source_document_id;
      return !partSource || !syntheticIds.has(partSource) || cp.part.validation_status === 'official_confirmed';
    });

    const noOfficialPartFound = realCandidates.length === 0;
    const orderSafetyStatus = worstSafetyStatus(realCandidates);

    // Aggregate what_to_confirm
    const allConfirmations = [...new Set(
      realCandidates.flatMap(p => p.what_to_confirm_before_order)
    )];

    // Evidence
    const evidence = realCandidates.flatMap(p => p.evidence);

    // Determine likely subsystem from first matched part
    let likelySubsystem: string | null = null;
    if (realCandidates[0]) {
      const subsystems = await this.repo.getSubsystemsByFamily(familyId);
      const part = realCandidates[0].part as any;
      const sub = subsystems.find(s => s.id === part.subsystem_id);
      likelySubsystem = sub?.name ?? null;
    }

    // Inferred block if no official part found
    let inferredNonOfficialAnswer = null;
    if (noOfficialPartFound) {
      inferredNonOfficialAnswer = await this.inferenceService.infer(
        familyId,
        `Parts query: ${partQuery}`,
        '',
      );
    }

    return {
      query: partQuery,
      likely_subsystem: likelySubsystem,
      candidate_parts: realCandidates,
      order_safety_status: orderSafetyStatus,
      what_to_confirm_before_order: allConfirmations,
      evidence,
      no_official_part_found: noOfficialPartFound,
      inferred_non_official_answer: inferredNonOfficialAnswer,
    };
  }

  private buildWhatToConfirm(part: any): string[] {
    const checks: string[] = [];
    if (part.order_safety_status === 'requires_visual_confirmation') {
      checks.push('Visually confirm part on machine before ordering');
    }
    if (part.order_safety_status === 'requires_serial_or_position_confirmation') {
      checks.push('Confirm machine serial number and part position label');
    }
    if (part.order_safety_status === 'not_safe_to_order') {
      checks.push('Part requires manual validation — do not order without technician confirmation');
    }
    if (part.validation_status === 'extracted_needs_review') {
      checks.push('Part has not been officially confirmed — review before ordering');
    }
    if (part.validation_status === 'conflict_detected') {
      checks.push('Conflict detected in documentation — verify part number manually');
    }
    return checks;
  }
}
