import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0';

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

async function queryCanonicalGraph(supabase: any, machineId: string, searchTerm: string): Promise<any> {
  const normSearchTerm = normalizeEntityName(searchTerm);

  // Get all clusters
  const { data: allClusters } = await supabase
    .from('canonical_clusters')
    .select('id, canonical_name, cluster_type, confidence')
    .eq('machine_id', machineId);

  if (!allClusters || allClusters.length === 0) {
    return {
      matched_clusters: [],
      aliases: [],
      linked_systems: [],
      linked_parts: [],
      linked_maintenance_tasks: [],
      linked_faults: [],
      linked_related_clusters: [],
      evidence_refs: [],
      confidence_summary: { total_matches: 0, avg_confidence: 'NONE', evidence_count: 0, link_count: 0 }
    };
  }

  const clusterIds = allClusters.map((c: any) => c.id);

  // Get aliases and members in parallel
  const [{ data: allAliases = [] }, { data: allMembers = [] }] = await Promise.all([
    supabase.from('canonical_cluster_aliases').select('cluster_id, alias').in('cluster_id', clusterIds),
    supabase.from('canonical_cluster_members').select('cluster_id, source_entity_id, source_entity_type').in('cluster_id', clusterIds)
  ]);

  const aliasesByClusterId: Record<string, string[]> = {};
  for (const alias of allAliases) {
    if (!aliasesByClusterId[alias.cluster_id]) aliasesByClusterId[alias.cluster_id] = [];
    aliasesByClusterId[alias.cluster_id].push(alias.alias);
  }

  const membersByClusterId: Record<string, any[]> = {};
  for (const member of allMembers) {
    if (!membersByClusterId[member.cluster_id]) membersByClusterId[member.cluster_id] = [];
    membersByClusterId[member.cluster_id].push({
      source_entity_id: member.source_entity_id,
      source_entity_type: member.source_entity_type
    });
  }

  // Match: Level 1 - Exact
  let matchedClusterIds: string[] = [];

  for (const cluster of allClusters) {
    if (normalizeEntityName(cluster.canonical_name) === normSearchTerm) {
      matchedClusterIds.push(cluster.id);
    }
  }

  // Level 2 - Alias match
  if (matchedClusterIds.length === 0) {
    for (const cluster of allClusters) {
      const aliases = aliasesByClusterId[cluster.id] || [];
      if (aliases.some((a: string) => normalizeEntityName(a) === normSearchTerm)) {
        matchedClusterIds.push(cluster.id);
      }
    }
  }

  // Level 3 - Fuzzy match with token expansion
  if (matchedClusterIds.length === 0 && normSearchTerm.length >= 4) {
    // Try common variations
    const variations = [normSearchTerm];
    if (normSearchTerm.includes('oil filter') || normSearchTerm.includes('filter oil')) {
      variations.push('hydraulic');
      variations.push('huile');
      variations.push('ölfilter');
    }

    for (const variation of variations) {
      for (const cluster of allClusters) {
        const normName = normalizeEntityName(cluster.canonical_name);
        const distance = levenshteinDistance(normName, variation);
        if (distance <= 2 || normName.includes(variation) || variation.includes(normName)) {
          matchedClusterIds.push(cluster.id);
        }
      }
    }
    matchedClusterIds = [...new Set(matchedClusterIds)];
  }

  // Build result
  const matchedClusters = allClusters
    .filter((c: any) => matchedClusterIds.includes(c.id))
    .map((c: any) => ({
      id: c.id,
      canonical_name: c.canonical_name,
      cluster_type: c.cluster_type,
      confidence: c.confidence,
      member_count: (membersByClusterId[c.id] || []).length
    }));

  const matchedAliases: string[] = [];
  for (const cid of matchedClusterIds) {
    matchedAliases.push(...(aliasesByClusterId[cid] || []));
  }

  // Get links
  const [{ data: outgoingLinks = [] }, { data: incomingLinks = [] }] = await Promise.all([
    supabase
      .from('canonical_cluster_links')
      .select('from_cluster_id, to_cluster_id, link_type, c2:canonical_clusters!to_cluster_id(canonical_name, cluster_type)')
      .in('from_cluster_id', matchedClusterIds),
    supabase
      .from('canonical_cluster_links')
      .select('from_cluster_id, to_cluster_id, link_type, c1:canonical_clusters!from_cluster_id(canonical_name, cluster_type)')
      .in('to_cluster_id', matchedClusterIds)
  ]);

  // Categorize links
  const linkedSystems: any[] = [];
  const linkedParts: any[] = [];
  const linkedMaintenance: any[] = [];
  const linkedFaults: any[] = [];
  const linkedRelated: any[] = [];

  for (const link of outgoingLinks) {
    const info = { name: link.c2?.canonical_name || 'unknown', link_type: link.link_type };
    if (link.c2?.cluster_type === 'system') linkedSystems.push(info);
    else if (link.c2?.cluster_type === 'part') linkedParts.push(info);
    else if (link.c2?.cluster_type === 'maintenance_target') linkedMaintenance.push(info);
    else if (link.c2?.cluster_type === 'fault_target') linkedFaults.push(info);
    else linkedRelated.push(info);
  }

  for (const link of incomingLinks) {
    const info = { name: link.c1?.canonical_name || 'unknown', link_type: link.link_type };
    if (link.c1?.cluster_type === 'system') linkedSystems.push(info);
    else if (link.c1?.cluster_type === 'part') linkedParts.push(info);
    else if (link.c1?.cluster_type === 'maintenance_target') linkedMaintenance.push(info);
    else if (link.c1?.cluster_type === 'fault_target') linkedFaults.push(info);
    else linkedRelated.push(info);
  }

  // Evidence
  const evidence: any[] = [];
  for (const cid of matchedClusterIds) {
    const members = membersByClusterId[cid] || [];
    for (const member of members) {
      evidence.push({
        source_entity_id: member.source_entity_id,
        source_entity_type: member.source_entity_type,
        member_cluster_id: cid
      });
    }
  }

  const avgConfidence = matchedClusters.length > 0 ? matchedClusters[0].confidence : 'NONE';

  return {
    top_cluster: matchedClusters[0] || null,
    matched_clusters: matchedClusters,
    aliases: matchedAliases,
    linked_systems: linkedSystems.slice(0, 5),
    linked_parts: linkedParts.slice(0, 5),
    linked_maintenance_tasks: linkedMaintenance.slice(0, 5),
    linked_faults: linkedFaults.slice(0, 5),
    linked_related_clusters: linkedRelated.slice(0, 5),
    related_paths: [
      ...linkedSystems.slice(0, 2),
      ...linkedParts.slice(0, 2),
      ...linkedMaintenance.slice(0, 1)
    ],
    evidence_refs: evidence,
    confidence_summary: {
      total_matches: matchedClusterIds.length,
      avg_confidence: avgConfidence,
      evidence_count: evidence.length,
      link_count: outgoingLinks.length + incomingLinks.length
    }
  };
}

export async function GET(request: NextRequest, { params }: { params: { machineId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const result = await queryCanonicalGraph(supabase, params.machineId, query);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
