import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

interface CanonicalCluster {
  cluster_id: string;
  canonical_name: string;
  cluster_type: 'system' | 'component' | 'part' | 'maintenance_target' | 'fault_target';
  confidence: string;
  source_entity_ids: string[];
}

async function rebuildCanonical(machineId: string, supabase: any) {
  // 1. Clean existing canonical
  const { data: clustersToDelete } = await supabase
    .from('canonical_clusters')
    .select('id')
    .eq('machine_id', machineId);

  const clusterIds = (clustersToDelete || []).map(c => c.id);

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

  await supabase
    .from('canonical_fusion_runs')
    .delete()
    .eq('machine_id', machineId);

  // 2. Load entities
  const { data: entities } = await supabase
    .from('machine_kb_entities')
    .select('*')
    .eq('machine_id', machineId);

  if (!entities || entities.length === 0) {
    return { success: false, error: 'No entities found', counts: {} };
  }

  // 3. Fuse by type
  const byType = new Map<string, any[]>();
  for (const entity of entities) {
    if (!byType.has(entity.entity_type)) byType.set(entity.entity_type, []);
    byType.get(entity.entity_type)!.push(entity);
  }

  const clusters: CanonicalCluster[] = [];
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

  // 4. Write clusters
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
    return { success: false, error: `Cluster write failed: ${clusterError.message}`, counts: {} };
  }

  // 5. Write members
  const dbClusterIds = new Map<string, string>();
  if (inserted) {
    for (let i = 0; i < inserted.length; i++) {
      dbClusterIds.set(clusters[i].cluster_id, inserted[i].id);
    }
  }

  // Create a map of entities for quick lookup
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
      return { success: false, error: `Member write failed: ${memberError.message}`, counts: {} };
    }
  }

  // 6. Count final state
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
    counts: {
      clusters: finalClusters?.length || 0,
      members: memberRows.length,
      ...typeCounts,
    },
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

    const result = await rebuildCanonical(params.machineId, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[rebuild-canonical]', error);
    return NextResponse.json(
      { success: false, error: error.message, counts: {} },
      { status: 500 }
    );
  }
}
