/**
 * ENVIROJIM — EvidenceService
 * Creates and queries evidence records. All extracted objects must have evidence.
 * SYNTHETIC GUARD: both createEvidence() and createEvidenceBatch() enforce the same check.
 * A source_document with is_synthetic=true can never produce official evidence.
 */

import { createAiCoreClient } from '@/lib/machines/intelligence/db/aiCoreClient';
import type { EvidenceRef } from '../contracts';

export interface CreateEvidenceParams {
  family_id: string;
  object_type: string;
  object_id: string;
  source_document_id: string;
  source_page: number;
  source_snippet: string;
  normalized_excerpt: string;
  evidence_role?: string;
  extraction_method: string;
  confidence_score: number;
}

export class EvidenceService {
  private supabase = createAiCoreClient();

  // ─── Shared synthetic guard ────────────────────────────────────────────────
  // Fetches is_synthetic flags for a set of source_document_ids in one query.
  // Returns the set of IDs that are synthetic.
  private async getSyntheticDocIds(sourceDocIds: string[]): Promise<Set<string>> {
    if (sourceDocIds.length === 0) return new Set();
    const unique = [...new Set(sourceDocIds)];
    const { data } = await this.supabase
      .from('source_documents')
      .select('id, is_synthetic')
      .in('id', unique);
    const syntheticIds = new Set<string>();
    for (const row of data ?? []) {
      if (row.is_synthetic) syntheticIds.add(row.id);
    }
    return syntheticIds;
  }

  // ─── createEvidence ────────────────────────────────────────────────────────
  async createEvidence(params: CreateEvidenceParams): Promise<string> {
    // SYNTHETIC GUARD — same check enforced here and in batch
    const syntheticIds = await this.getSyntheticDocIds([params.source_document_id]);
    if (syntheticIds.has(params.source_document_id)) {
      throw new Error(
        `EvidenceService.createEvidence: source_document ${params.source_document_id} is synthetic — ` +
        `evidence not created for ${params.object_type}/${params.object_id}`,
      );
    }

    if (!params.source_snippet?.trim()) {
      throw new Error(`EvidenceService: source_snippet required for ${params.object_type}/${params.object_id}`);
    }
    if (!params.normalized_excerpt?.trim()) {
      throw new Error(`EvidenceService: normalized_excerpt required`);
    }
    if (params.source_page < 1) {
      throw new Error(`EvidenceService: source_page must be >= 1`);
    }

    const { data, error } = await this.supabase
      .from('evidence')
      .insert({
        family_id: params.family_id,
        object_type: params.object_type,
        object_id: params.object_id,
        source_document_id: params.source_document_id,
        source_page: params.source_page,
        source_snippet: params.source_snippet,
        normalized_excerpt: params.normalized_excerpt,
        evidence_role: params.evidence_role ?? 'primary',
        extraction_method: params.extraction_method,
        confidence_score: params.confidence_score,
      })
      .select('id')
      .single();

    if (error) throw new Error(`EvidenceService.createEvidence: ${error.message}`);
    return data.id;
  }

  // ─── createEvidenceBatch ───────────────────────────────────────────────────
  // SYNTHETIC GUARD: identical enforcement — any item from a synthetic source is rejected.
  // Throws if ANY item is synthetic (no silent partial insert).
  async createEvidenceBatch(items: CreateEvidenceParams[]): Promise<void> {
    // Basic validation first
    const validated = items.filter(
      e => e.source_snippet?.trim() && e.normalized_excerpt?.trim() && e.source_page >= 1,
    );
    if (validated.length === 0) return;

    // SYNTHETIC GUARD — batch: resolve all source_document_ids in one query
    const syntheticIds = await this.getSyntheticDocIds(
      validated.map(e => e.source_document_id),
    );

    const synthetic = validated.filter(e => syntheticIds.has(e.source_document_id));
    if (synthetic.length > 0) {
      throw new Error(
        `EvidenceService.createEvidenceBatch: ${synthetic.length} item(s) reference synthetic source(s) — ` +
        `synthetic doc IDs: ${[...new Set(synthetic.map(e => e.source_document_id))].join(', ')}. ` +
        `Batch rejected entirely. Remove synthetic items before calling createEvidenceBatch().`,
      );
    }

    const { error } = await this.supabase.from('evidence').insert(
      validated.map(e => ({
        family_id: e.family_id,
        object_type: e.object_type,
        object_id: e.object_id,
        source_document_id: e.source_document_id,
        source_page: e.source_page,
        source_snippet: e.source_snippet,
        normalized_excerpt: e.normalized_excerpt,
        evidence_role: e.evidence_role ?? 'primary',
        extraction_method: e.extraction_method,
        confidence_score: e.confidence_score,
      })),
    );
    if (error) throw new Error(`EvidenceService.createEvidenceBatch: ${error.message}`);
  }

  // ─── Read ──────────────────────────────────────────────────────────────────
  async getForObject(objectType: string, objectId: string): Promise<EvidenceRef[]> {
    const { data, error } = await this.supabase
      .from('evidence')
      .select('*')
      .eq('object_type', objectType)
      .eq('object_id', objectId)
      .order('confidence_score', { ascending: false });
    if (error) throw new Error(`EvidenceService.getForObject: ${error.message}`);
    return data ?? [];
  }

  async getForObjects(objectType: string, objectIds: string[]): Promise<Record<string, EvidenceRef[]>> {
    if (objectIds.length === 0) return {};
    const { data, error } = await this.supabase
      .from('evidence')
      .select('*')
      .eq('object_type', objectType)
      .in('object_id', objectIds);
    if (error) throw new Error(`EvidenceService.getForObjects: ${error.message}`);

    const result: Record<string, EvidenceRef[]> = {};
    for (const row of data ?? []) {
      if (!result[row.object_id]) result[row.object_id] = [];
      result[row.object_id].push(row);
    }
    return result;
  }
}
