import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function buildMachineKnowledge(machineId: string, supabase: any) {
  // Step 1: Get current state before build
  const [entities, evidence, docs, clusters] = await Promise.all([
    supabase.from('machine_kb_entities').select('id', { count: 'exact', head: true }).eq('machine_id', machineId),
    supabase.from('machine_kb_evidence').select('id', { count: 'exact', head: true }).eq('machine_id', machineId),
    supabase.from('machine_documents').select('id', { count: 'exact', head: true }).eq('machine_id', machineId),
    supabase.from('canonical_clusters').select('id, cluster_type', { count: 'exact', head: false }).eq('machine_id', machineId),
  ]);

  const sourceEntityCount = entities.count || 0;
  const evidenceCount = evidence.count || 0;
  const docCount = docs.count || 0;

  // Step 2: Check if source documents exist for refresh
  if (docCount === 0) {
    // Skip refresh if no documents, but proceed with rebuild
    const clusterCounts = buildTypeCounts(clusters.data);
    return {
      success: true,
      phase: 'completed',
      warning: 'No documents to refresh, using existing source entities',
      counts: {
        source_entities: sourceEntityCount,
        evidence: evidenceCount,
        documents: docCount,
        canonical_clusters: clusters.count || 0,
        canonical_members: 0,
        canonical_links: 0,
        counts_by_type: clusterCounts,
      },
    };
  }

  // Step 3: Delete existing canonical data for clean rebuild
  const clusterIds = (clusters.data || []).map((c: any) => c.id);
  if (clusterIds.length > 0) {
    await supabase.from('canonical_cluster_links').delete().in('cluster_id', clusterIds);
    await supabase.from('canonical_cluster_members').delete().in('cluster_id', clusterIds);
    await supabase.from('canonical_cluster_aliases').delete().in('cluster_id', clusterIds);
    await supabase.from('canonical_clusters').delete().in('id', clusterIds);
  }

  // Step 4: Rebuild canonical by calling rebuild endpoint
  const rebuildReq = await fetch(
    `http://localhost:3004/api/admin/machines/${machineId}/rebuild-canonical`,
    { method: 'POST' }
  ).catch(() => null);

  const rebuildResult = rebuildReq ? await rebuildReq.json() : null;

  if (!rebuildResult?.success) {
    return {
      success: false,
      error: 'Rebuild failed',
      phase: 'rebuild_failed',
      counts: {
        source_entities: sourceEntityCount,
        evidence: evidenceCount,
        documents: docCount,
        canonical_clusters: 0,
        canonical_members: 0,
        canonical_links: 0,
      },
    };
  }

  return {
    success: true,
    phase: 'completed',
    counts: {
      source_entities: sourceEntityCount,
      evidence: evidenceCount,
      documents: docCount,
      canonical_clusters: rebuildResult.counts?.clusters || 0,
      canonical_members: rebuildResult.counts?.members || 0,
      canonical_links: 0,
      counts_by_type: {
        part: rebuildResult.counts?.part || 0,
        maintenance_target: rebuildResult.counts?.maintenance_target || 0,
        fault_target: rebuildResult.counts?.fault_target || 0,
        system: rebuildResult.counts?.system || 0,
      },
    },
  };
}

function buildTypeCounts(clusters: any[] | null) {
  if (!clusters) return {};
  const counts: Record<string, number> = {};
  (clusters || []).forEach((c: any) => {
    counts[c.cluster_type] = (counts[c.cluster_type] || 0) + 1;
  });
  return counts;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const result = await buildMachineKnowledge(params.machineId, supabase);

    // Revalidate machine page to refresh data
    if (result.success) {
      revalidatePath(`/dashboard/machines/${params.machineId}`);
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMsg, phase: 'failed' },
      { status: 500 }
    );
  }
}
