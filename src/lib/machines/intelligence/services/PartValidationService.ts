/**
 * ENVIROJIM — PartValidationService
 * Rules:
 * - No part without a part_number
 * - No official part without source_document_id / source_page / source_snippet
 * - Incomplete part → blocked_incomplete + data_quality_issue (blocking)
 * - No safe_to_order without official_confirmed
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import type { DataQualityIssue, OrderSafetyStatus, PartValidationStatus } from '../contracts';

export interface PartInput {
  family_id: string;
  subsystem_id: string;
  primary_assembly_id: string;
  primary_component_id: string;
  part_number: string;
  part_name: string;
  normalized_part_name: string;
  part_type: string;
  is_wear_part?: boolean;
  is_consumable?: boolean;
  quantity_status?: string;
  quantity_value?: number;
  unit?: string;
  official_source_document_id?: string;
  official_source_page?: number;
  official_source_snippet?: string;
  official_evidence_confidence?: number;
}

export interface PartValidationResult {
  valid: boolean;
  validation_status: PartValidationStatus;
  order_safety_status: OrderSafetyStatus;
  blocking_issues: DataQualityIssue[];
}

export class PartValidationService {
  private supabase = createAiCoreClient();

  validate(input: PartInput): PartValidationResult {
    const issues: DataQualityIssue[] = [];

    // Rule 1: part_number required
    if (!input.part_number?.trim()) {
      issues.push({
        object_type: 'part',
        object_id: 'pending',
        issue_type: 'missing_part_number',
        issue_description: `Part "${input.part_name}" has no part number — cannot be created as official part`,
        severity: 'critical',
        blocking_flag: true,
      });
    }

    // Rule 2: official evidence required
    const hasDoc = !!input.official_source_document_id;
    const hasPage = (input.official_source_page ?? 0) > 0;
    const hasSnippet = !!input.official_source_snippet?.trim();

    if (!hasDoc || !hasPage || !hasSnippet) {
      issues.push({
        object_type: 'part',
        object_id: 'pending',
        issue_type: 'missing_official_evidence',
        issue_description: `Part "${input.part_number || input.part_name}" is missing document/page/snippet proof`,
        severity: 'high',
        blocking_flag: true,
      });
    }

    if (issues.length > 0) {
      return {
        valid: false,
        validation_status: 'blocked_incomplete',
        order_safety_status: 'not_safe_to_order',
        blocking_issues: issues,
      };
    }

    return {
      valid: true,
      validation_status: 'extracted_needs_review',
      order_safety_status: 'requires_visual_confirmation',
      blocking_issues: [],
    };
  }

  async upsertPart(input: PartInput): Promise<{ id: string; blocked: boolean }> {
    const result = this.validate(input);

    const payload = {
      family_id: input.family_id,
      subsystem_id: input.subsystem_id,
      primary_assembly_id: input.primary_assembly_id,
      primary_component_id: input.primary_component_id,
      part_number: input.part_number?.trim() || 'MISSING_NUMBER',
      part_name: input.part_name,
      normalized_part_name: input.normalized_part_name,
      part_type: input.part_type,
      is_wear_part: input.is_wear_part ?? false,
      is_consumable: input.is_consumable ?? false,
      quantity_status: input.quantity_status ?? 'unknown_but_required',
      quantity_value: input.quantity_value ?? 0,
      unit: input.unit ?? 'ea',
      order_safety_status: result.order_safety_status,
      official_source_document_id: input.official_source_document_id,
      official_source_page: input.official_source_page,
      official_source_snippet: input.official_source_snippet ?? '',
      official_evidence_confidence: input.official_evidence_confidence ?? 0,
      validation_status: result.validation_status,
    };

    const { data, error } = await this.supabase
      .from('parts')
      .upsert(payload, { onConflict: 'family_id,part_number' })
      .select('id')
      .single();

    if (error) throw new Error(`PartValidationService.upsertPart: ${error.message}`);

    // Record blocking issues
    if (result.blocking_issues.length > 0) {
      await this.recordIssues(input.family_id, data.id, result.blocking_issues);
    }

    return { id: data.id, blocked: !result.valid };
  }

  async confirmPart(partId: string, familyId: string): Promise<void> {
    // Can only confirm if no blocking issues remain
    const { data: issues } = await this.supabase
      .from('data_quality_issues')
      .select('id')
      .eq('object_type', 'part')
      .eq('object_id', partId)
      .eq('blocking_flag', true)
      .neq('resolution_status', 'resolved')
      .limit(1);

    if (issues && issues.length > 0) {
      throw new Error(`PartValidationService.confirmPart: part ${partId} has unresolved blocking issues`);
    }

    // SYNTHETIC GUARD: cannot confirm a part whose official source is synthetic
    const { data: part } = await this.supabase
      .from('parts')
      .select('official_source_document_id')
      .eq('id', partId)
      .single();

    if (part?.official_source_document_id) {
      const { data: srcDoc } = await this.supabase
        .from('source_documents')
        .select('is_synthetic')
        .eq('id', part.official_source_document_id)
        .single();

      if (srcDoc?.is_synthetic) {
        throw new Error(
          `PartValidationService.confirmPart: BLOCKED — part ${partId} official source is synthetic. ` +
          `Cannot promote to official_confirmed or safe_to_order from a bootstrap document.`,
        );
      }
    }

    const { error } = await this.supabase
      .from('parts')
      .update({
        validation_status: 'official_confirmed',
        order_safety_status: 'safe_to_order',
      })
      .eq('id', partId)
      .eq('family_id', familyId);

    if (error) throw new Error(`PartValidationService.confirmPart: ${error.message}`);
  }

  private async recordIssues(familyId: string, objectId: string, issues: DataQualityIssue[]): Promise<void> {
    const rows = issues.map(i => ({
      family_id: familyId,
      object_type: i.object_type,
      object_id: objectId,
      issue_type: i.issue_type,
      issue_description: i.issue_description,
      severity: i.severity,
      blocking_flag: i.blocking_flag,
      resolution_status: 'open' as const,
      detected_by: 'PartValidationService',
    }));

    await this.supabase.from('data_quality_issues').insert(rows);
  }
}
