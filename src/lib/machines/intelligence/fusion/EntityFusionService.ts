/**
 * Entity Fusion Service
 * Generic multi-document entity linking and clustering for machine knowledge bases.
 * Groups entities from multiple documents that refer to the same machine component/system/part.
 *
 * V1 Rules: name normalization, case/language variants, simple aliases, weak semantic proximity,
 * document context, conservative merging (prefer non-merged if in doubt).
 */

export interface EntityRecord {
  id: string;
  entity_type: 'part' | 'procedure' | 'maintenance_task' | 'fault_case' | 'system';
  canonical_name: string;
  original_label: string;
  language: string;
  confidence: 'low' | 'medium' | 'high';
  status: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  normalized_payload: Record<string, any>;
  document_id?: string;
  source_docs?: string[];
}

export interface EvidenceRecord {
  id: string;
  entity_id: string;
  snippet: string;
  page: string;
  source_document_id: string;
}

export interface CanonicalCluster {
  cluster_id: string;
  canonical_name: string;
  cluster_type: 'system' | 'component' | 'part' | 'maintenance_target' | 'fault_target';
  source_entity_ids: string[];
  source_entity_types: ('part' | 'procedure' | 'maintenance_task' | 'fault_case' | 'system')[];
  source_docs: string[];
  aliases: string[];
  linked_parts: string[];
  linked_maintenance_tasks: string[];
  linked_faults: string[];
  linked_systems: string[];
  confidence: 'low' | 'medium' | 'high';
  evidence_refs: Array<{
    entity_id: string;
    snippet: string;
    page: string;
    source_doc: string;
  }>;
  merge_rationale: string;
}

/**
 * Normalizes entity name for comparison:
 * - lowercase
 * - remove special chars except spaces
 * - collapse multiple spaces
 * - trim
 */
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute levenshtein distance (max 1 edit per 5 chars for match)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Check if two normalized names are similar enough to merge
 * Rule: edit distance <= 2 OR one is prefix of other
 */
export function areNamesSimilar(nameA: string, nameB: string): boolean {
  if (nameA === nameB) return true;
  if (nameA.length === 0 || nameB.length === 0) return false;

  const dist = levenshteinDistance(nameA, nameB);
  const maxDist = Math.ceil(Math.max(nameA.length, nameB.length) / 5);

  if (dist <= Math.min(2, maxDist)) return true;

  // Check prefix/suffix
  if (nameA.includes(nameB) || nameB.includes(nameA)) {
    const shorter = nameA.length < nameB.length ? nameA : nameB;
    const longer = nameA.length < nameB.length ? nameB : nameA;
    if (longer.split(' ').some(word => word.startsWith(shorter))) return true;
  }

  return false;
}

/**
 * Extract key context from entity payload to help identify same objects
 */
export function extractEntityContext(entity: EntityRecord): {
  keywords: string[];
  types: string[];
} {
  const keywords: string[] = [];
  const types: string[] = [entity.entity_type];

  // From normalized payload: extract type hints
  const payload = entity.normalized_payload || {};
  if (payload.type) keywords.push(String(payload.type).toLowerCase());
  if (payload.system) keywords.push(String(payload.system).toLowerCase());
  if (payload.function) keywords.push(String(payload.function).toLowerCase());
  if (payload.criticality) keywords.push(String(payload.criticality).toLowerCase());

  return { keywords, types };
}

/**
 * Main fusion service: group entities by similarity
 */
export function fuseEntities(
  entities: EntityRecord[],
  evidence: EvidenceRecord[]
): CanonicalCluster[] {
  const clusters: Map<string, CanonicalCluster> = new Map();
  const merged: Set<string> = new Set();

  // Group by entity type first (systems with systems, parts with parts, etc.)
  const byType = new Map<string, EntityRecord[]>();
  for (const entity of entities) {
    if (!byType.has(entity.entity_type)) {
      byType.set(entity.entity_type, []);
    }
    byType.get(entity.entity_type)!.push(entity);
  }

  let clusterId = 0;

  // Within each type, find similar entities
  for (const [entityType, typeEntities] of byType.entries()) {
    const seen: Set<string> = new Set();

    for (let i = 0; i < typeEntities.length; i++) {
      if (seen.has(typeEntities[i].id)) continue;

      const anchor = typeEntities[i];
      const anchorNorm = normalizeEntityName(anchor.canonical_name);
      const clusterEntities: EntityRecord[] = [anchor];
      seen.add(anchor.id);

      // Find similar entities
      for (let j = i + 1; j < typeEntities.length; j++) {
        if (seen.has(typeEntities[j].id)) continue;

        const candidate = typeEntities[j];
        const candidateNorm = normalizeEntityName(candidate.canonical_name);

        if (areNamesSimilar(anchorNorm, candidateNorm)) {
          clusterEntities.push(candidate);
          seen.add(candidate.id);
        }
      }

      // Create cluster
      const clusterKey = `cluster_${clusterId++}`;
      const clusterType = mapEntityTypeToClusterType(entityType);
      const canonicalName =
        clusterEntities.length === 1
          ? anchor.canonical_name
          : chooseBestCanonicalName(clusterEntities);

      const entityIds = clusterEntities.map(e => e.id);
      const sourceDocs = Array.from(
        new Set(
          clusterEntities
            .flatMap(e => e.source_docs || [])
            .filter(Boolean)
        )
      );

      const entityEvidence = evidence.filter(e =>
        entityIds.includes(e.entity_id)
      );

      clusters.set(clusterKey, {
        cluster_id: clusterKey,
        canonical_name: canonicalName,
        cluster_type: clusterType,
        source_entity_ids: entityIds,
        source_entity_types: clusterEntities.map(e => e.entity_type),
        source_docs: sourceDocs,
        aliases: clusterEntities
          .map(e => e.canonical_name)
          .filter((n, i, arr) => arr.indexOf(n) === i),
        linked_parts: extractLinkedEntities(clusterEntities, 'part'),
        linked_maintenance_tasks: extractLinkedEntities(clusterEntities, 'maintenance_task'),
        linked_faults: extractLinkedEntities(clusterEntities, 'fault_case'),
        linked_systems: extractLinkedEntities(clusterEntities, 'system'),
        confidence: aggregateConfidence(clusterEntities),
        evidence_refs: entityEvidence.map(e => ({
          entity_id: e.entity_id,
          snippet: e.snippet,
          page: e.page,
          source_doc: e.source_document_id,
        })),
        merge_rationale:
          clusterEntities.length === 1
            ? 'Single entity (no merge)'
            : `${clusterEntities.length} entities merged by name similarity (normalized distance <= 2)`,
      });
    }
  }

  // Cross-type linking: find parts/tasks/faults that reference same systems
  linkCrossTypeEntities(clusters, entities);

  return Array.from(clusters.values());
}

/**
 * Map entity_type to cluster_type for reporting
 */
function mapEntityTypeToClusterType(
  entityType: string
): 'system' | 'component' | 'part' | 'maintenance_target' | 'fault_target' {
  switch (entityType) {
    case 'system':
      return 'system';
    case 'part':
      return 'part';
    case 'maintenance_task':
    case 'procedure':
      return 'maintenance_target';
    case 'fault_case':
      return 'fault_target';
    default:
      return 'component';
  }
}

/**
 * Choose best canonical name (longest, highest confidence)
 */
function chooseBestCanonicalName(entities: EntityRecord[]): string {
  return entities.reduce((best, curr) => {
    if (curr.canonical_name.length > best.canonical_name.length) return curr;
    if (curr.confidence === 'high' && best.confidence !== 'high') return curr;
    return best;
  }).canonical_name;
}

/**
 * Extract linked entities of a given type from payload
 */
function extractLinkedEntities(entities: EntityRecord[], linkType: string): string[] {
  const linked = new Set<string>();
  for (const entity of entities) {
    const payload = entity.normalized_payload || {};
    if (linkType === 'part' && Array.isArray(payload.parts)) {
      payload.parts.forEach((p: any) =>
        linked.add(typeof p === 'string' ? p : p.name || String(p))
      );
    }
    if (linkType === 'maintenance_task' && Array.isArray(payload.procedures)) {
      payload.procedures.forEach((p: any) =>
        linked.add(typeof p === 'string' ? p : p.name || String(p))
      );
    }
    if (linkType === 'fault_case' && Array.isArray(payload.faults)) {
      payload.faults.forEach((f: any) =>
        linked.add(typeof f === 'string' ? f : f.description || String(f))
      );
    }
    if (linkType === 'system' && Array.isArray(payload.systems)) {
      payload.systems.forEach((s: any) =>
        linked.add(typeof s === 'string' ? s : s.name || String(s))
      );
    }
  }
  return Array.from(linked).slice(0, 10);
}

/**
 * Aggregate confidence from multiple entities
 */
function aggregateConfidence(entities: EntityRecord[]): 'low' | 'medium' | 'high' {
  const scores = { low: 1, medium: 2, high: 3 };
  const avg =
    entities.reduce((sum, e) => sum + scores[e.confidence], 0) / entities.length;
  if (avg >= 2.5) return 'high';
  if (avg >= 1.5) return 'medium';
  return 'low';
}

/**
 * Placeholder: cross-type linking (can be extended)
 */
function linkCrossTypeEntities(
  clusters: Map<string, CanonicalCluster>,
  entities: EntityRecord[]
): void {
  // Future: implement semantic linking between clusters
  // e.g., if a maintenance_task references a part, link them
}

/**
 * Export fusion result to JSON artifact
 */
export function generateFusionArtifact(
  machineId: string,
  clusters: CanonicalCluster[],
  entityCount: number,
  documentCount: number
): Record<string, any> {
  return {
    metadata: {
      timestamp: new Date().toISOString(),
      machine_id: machineId,
      source_entity_count: entityCount,
      source_document_count: documentCount,
      canonical_cluster_count: clusters.length,
    },
    clusters: clusters,
    summary: {
      total_systems: clusters.filter(c => c.cluster_type === 'system').length,
      total_parts: clusters.filter(c => c.cluster_type === 'part').length,
      total_maintenance_targets: clusters.filter(
        c => c.cluster_type === 'maintenance_target'
      ).length,
      total_fault_targets: clusters.filter(c => c.cluster_type === 'fault_target').length,
      merged_entity_pairs: clusters.filter(
        c => c.source_entity_ids.length > 1
      ).length,
      high_confidence_clusters: clusters.filter(c => c.confidence === 'high').length,
    },
  };
}
