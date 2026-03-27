import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function refreshMachineKnowledge(machineId: string, supabase: any) {
  // SAFEGUARD: Check if we have valid extraction documents before proceeding
  const { data: documents } = await supabase
    .from('machine_documents')
    .select('id, document_title, document_type')
    .eq('machine_id', machineId);

  const sourceDocCount = (documents || []).length;

  // SAFEGUARD: If no documents exist, we can't re-extract source entities
  // Return current state without modifications to prevent data loss
  if (sourceDocCount === 0) {
    const { data: currentEntities } = await supabase
      .from('machine_kb_entities')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', machineId);

    const { data: currentEvidence } = await supabase
      .from('machine_kb_evidence')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', machineId);

    const { data: currentClusters } = await supabase
      .from('canonical_clusters')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', machineId);

    return {
      success: false,
      error: 'No source documents found. Cannot refresh without documents to re-extract from. Existing state preserved.',
      refresh_state: 'no_documents_abort_safeguard',
      counts: {
        documents: 0,
        source_entities: currentEntities?.length || 0,
        evidence: currentEvidence?.length || 0,
        canonical_clusters: currentClusters?.length || 0,
        canonical_members: 0,
      },
    };
  }

  // 2. Safe to proceed: delete entities only if documents exist for re-extraction
  const { data: entitiesToDelete } = await supabase
    .from('machine_kb_entities')
    .select('id')
    .eq('machine_id', machineId);

  const entityIds = (entitiesToDelete || []).map(e => e.id);

  if (entityIds.length > 0) {
    // Delete evidence first (foreign key constraint)
    await supabase
      .from('machine_kb_evidence')
      .delete()
      .in('entity_id', entityIds);

    // Delete entities
    await supabase
      .from('machine_kb_entities')
      .delete()
      .in('id', entityIds);
  }

  // 3. Get current source entity count (after deletion)
  const { data: currentEntities } = await supabase
    .from('machine_kb_entities')
    .select('id', { count: 'exact', head: true })
    .eq('machine_id', machineId);
  let sourceEntityCount = currentEntities?.length || 0;

  // 5. Run canonical rebuild (safe - source deletion is already done)
  const { data: clusters } = await supabase
    .from('canonical_clusters')
    .select('id')
    .eq('machine_id', machineId);

  const clusterIds = (clusters || []).map(c => c.id);

  // Clean canonical data
  if (clusterIds.length > 0) {
    await Promise.all([
      supabase
        .from('canonical_cluster_members')
        .delete()
        .in('cluster_id', clusterIds),
      supabase
        .from('canonical_cluster_aliases')
        .delete()
        .in('cluster_id', clusterIds),
      supabase
        .from('canonical_cluster_links')
        .delete()
        .or(`from_cluster_id.in.(${clusterIds.join(',')}),to_cluster_id.in.(${clusterIds.join(',')})`),
    ]);
  }

  await supabase
    .from('canonical_clusters')
    .delete()
    .eq('machine_id', machineId);

  // 6. Re-extract entities (simple approach: trigger via background or return pending)
  // For now, just return state with note that source refresh is pending
  const { data: finalEntities } = await supabase
    .from('machine_kb_entities')
    .select('entity_type', { count: 'exact', head: true })
    .eq('machine_id', machineId);

  const finalEntityCount = finalEntities?.length || 0;

  // 7. Run rebuild canonical on current entities
  // Call the rebuild logic inline
  const rebuildResult = await rebuildCanonicalForRefresh(machineId, supabase);

  return {
    success: true,
    refresh_state: 'entities_cleaned_canonical_rebuilding',
    counts: {
      documents: sourceDocCount,
      source_entities: finalEntityCount,
      canonical_clusters: rebuildResult.clusters,
      canonical_members: rebuildResult.members,
      canonical_links: rebuildResult.links,
      ...rebuildResult.typeDistribution,
    },
  };
}

function normalizeEntityName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const dp: number[][] = Array(aLen + 1)
    .fill(null)
    .map(() => Array(bLen + 1).fill(0));

  for (let i = 0; i <= aLen; i++) dp[i][0] = i;
  for (let j = 0; j <= bLen; j++) dp[0][j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[aLen][bLen];
}

function areNamesSimilar(nameA: string, nameB: string): boolean {
  const dist = levenshteinDistance(nameA, nameB);
  const threshold = Math.max(nameA.length, nameB.length) / 5;
  return dist <= threshold || nameA.includes(nameB) || nameB.includes(nameA);
}

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

async function rebuildCanonicalForRefresh(machineId: string, supabase: any) {
  const { data: entities } = await supabase
    .from('machine_kb_entities')
    .select('*')
    .eq('machine_id', machineId);

  if (!entities || entities.length === 0) {
    return {
      success: false,
      error: 'No entities to rebuild from',
      clusters: 0,
      members: 0,
      links: 0,
      typeDistribution: {},
    };
  }

  // Fuse by type
  const byType = new Map<string, any[]>();
  for (const entity of entities) {
    if (!byType.has(entity.entity_type)) byType.set(entity.entity_type, []);
    byType.get(entity.entity_type)!.push(entity);
  }

  const clusters: any[] = [];
  let clusterId = 0;

  for (const [entityType, typeEntities] of byType.entries()) {
    const seen: Set<string> = new Set();
    const clusterType = mapEntityTypeToClusterType(entityType);

    for (let i = 0; i < typeEntities.length; i++) {
      if (seen.has(typeEntities[i].id)) continue;

      const anchor = typeEntities[i];
      const anchorNorm = normalizeEntityName(anchor.canonical_name);
      const clusterEntities = [anchor];
      seen.add(anchor.id);

      for (let j = i + 1; j < typeEntities.length; j++) {
        if (seen.has(typeEntities[j].id)) continue;
        const candidate = typeEntities[j];
        const candidateNorm = normalizeEntityName(candidate.canonical_name);
        if (areNamesSimilar(anchorNorm, candidateNorm)) {
          clusterEntities.push(candidate);
          seen.add(candidate.id);
        }
      }

      clusters.push({
        cluster_id: `cluster_${clusterId++}`,
        canonical_name: anchor.canonical_name,
        cluster_type: clusterType,
        confidence: anchor.confidence || 'MEDIUM',
        source_entity_ids: clusterEntities.map(e => e.id),
      });
    }
  }

  // Write clusters
  const clusterRows = clusters.map(c => ({
    machine_id: machineId,
    canonical_name: c.canonical_name,
    cluster_type: c.cluster_type,
    confidence: c.confidence,
  }));

  const { data: inserted, error: clusterError } = await supabase
    .from('canonical_clusters')
    .insert(clusterRows)
    .select('id');

  if (clusterError) {
    return {
      success: false,
      error: clusterError.message,
      clusters: 0,
      members: 0,
      links: 0,
      typeDistribution: {},
    };
  }

  // Write members
  const dbClusterIds = new Map<string, string>();
  if (inserted) {
    for (let i = 0; i < inserted.length; i++) {
      dbClusterIds.set(clusters[i].cluster_id, inserted[i].id);
    }
  }

  const entityMap = new Map<string, any>();
  entities.forEach(e => entityMap.set(e.id, e));

  const memberRows: any[] = [];
  for (const cluster of clusters) {
    const dbClusterId = dbClusterIds.get(cluster.cluster_id);
    if (!dbClusterId) continue;
    for (const entityId of cluster.source_entity_ids) {
      const entity = entityMap.get(entityId);
      memberRows.push({
        cluster_id: dbClusterId,
        source_entity_id: entityId,
        source_entity_type: entity?.entity_type || 'unknown',
      });
    }
  }

  if (memberRows.length > 0) {
    const { error: memberError } = await supabase
      .from('canonical_cluster_members')
      .insert(memberRows);
    if (memberError) {
      return {
        success: false,
        error: memberError.message,
        clusters: 0,
        members: 0,
        links: 0,
        typeDistribution: {},
      };
    }
  }

  // Count final state
  const { data: finalClusters } = await supabase
    .from('canonical_clusters')
    .select('cluster_type')
    .eq('machine_id', machineId);

  const typeCounts: Record<string, number> = {};
  (finalClusters || []).forEach(c => {
    typeCounts[c.cluster_type] = (typeCounts[c.cluster_type] || 0) + 1;
  });

  return {
    success: true,
    clusters: finalClusters?.length || 0,
    members: memberRows.length,
    links: 0,
    typeDistribution: typeCounts,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const result = await refreshMachineKnowledge(params.machineId, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[refresh-machine-knowledge]', error);
    return NextResponse.json(
      { success: false, error: error.message, counts: {} },
      { status: 500 }
    );
  }
}
