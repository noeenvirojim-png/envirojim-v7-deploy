import { BaseKbEntity, Evidence, KbStatus, KbConfidence } from './types';
import { generateEvidenceHash } from './utils';

export class KnowledgeConsolidator {
  /**
   * Consolidates multiple document extractions into a unified KB structure.
   */
  async consolidate(extractions: any[]): Promise<{
    entities: any[];
    contradictions: any[];
    ambiguities: any[];
  }> {
    const consolidatedEntities: Map<string, any> = new Map();
    const contradictions: any[] = [];
    const ambiguities: any[] = [];

    for (const extraction of extractions) {
      const data = extraction.extraction_json;
      
      // Process Warnings, Procedures, Parts, etc.
      this.mergeCategory(consolidatedEntities, data.warnings || [], 'warning', extraction.document_id);
      this.mergeCategory(consolidatedEntities, data.procedures || [], 'procedure', extraction.document_id);
      this.mergeCategory(consolidatedEntities, data.maintenance_tasks || [], 'maintenance_task', extraction.document_id);
      this.mergeCategory(consolidatedEntities, data.fault_cases || [], 'fault_case', extraction.document_id);
      this.mergeCategory(consolidatedEntities, data.parts || [], 'part', extraction.document_id);
      this.mergeCategory(consolidatedEntities, data.technical_parameters || [], 'technical_parameter', extraction.document_id);

      // Collect Contradictions and Ambiguities
      if (data.contradictions_inside_document) {
        contradictions.push(...data.contradictions_inside_document.map((c: string) => ({
          document_id: extraction.document_id,
          description: c
        })));
      }
      if (data.ambiguous_items) {
        ambiguities.push(...data.ambiguous_items.map((a: string) => ({
          document_id: extraction.document_id,
          description: a
        })));
      }
    }

    return {
      entities: Array.from(consolidatedEntities.values()),
      contradictions,
      ambiguities
    };
  }

  private mergeCategory(
    masterMap: Map<string, any>, 
    items: any[], 
    type: string,
    documentId: string
  ) {
    if (!items) return;

    for (const item of items) {
      // Logic for deduplication: 
      // For parts: part_number is primary.
      // For others: canonical_name.
      const key = (item.part_number || item.canonical_name || item.original_label).toLowerCase().trim();
      const uniqueKey = `${type}:${key}`;

      if (masterMap.has(uniqueKey)) {
        const existing = masterMap.get(uniqueKey);
        // Merge evidence
        if (item.evidence) {
          existing.evidence.push(...item.evidence);
        }
        // Merge aliases
        if (item.aliases) {
          existing.aliases = Array.from(new Set([...existing.aliases, ...item.aliases]));
        }
        // Update confidence if higher
        if (this.confidenceValue(item.confidence) > this.confidenceValue(existing.confidence)) {
          existing.confidence = item.confidence;
        }
      } else {
        masterMap.set(uniqueKey, {
          ...item,
          entity_type: type,
          evidence: item.evidence || []
        });
      }
    }
  }

  private confidenceValue(conf: KbConfidence): number {
    switch (conf) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }
}
