/**
 * Canonical Query Service
 * Read-only query layer on canonical graph
 * No writes to canonical tables
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CanonicalQueryResult {
  top_cluster?: {
    id: string;
    canonical_name: string;
    cluster_type: string;
    confidence: string;
    member_count: number;
  };
  matched_clusters: Array<{
    id: string;
    canonical_name: string;
    cluster_type: string;
    confidence: string;
    member_count: number;
  }>;
  aliases: string[];
  linked_systems: Array<{ name: string; link_type: string }>;
  linked_parts: Array<{ name: string; link_type: string }>;
  linked_maintenance_tasks: Array<{ name: string; link_type: string }>;
  linked_faults: Array<{ name: string; link_type: string }>;
  linked_related_clusters: Array<{ name: string; link_type: string }>;
  evidence_refs: Array<{
    source_entity_id: string;
    source_entity_type: string;
    member_cluster_id: string;
  }>;
  confidence_summary: {
    total_matches: number;
    avg_confidence: string;
    evidence_count: number;
    link_count: number;
  };
}

interface ClusterWithMembers {
  id: string;
  canonical_name: string;
  cluster_type: string;
  confidence: string;
  members: Array<{ source_entity_id: string; source_entity_type: string }>;
  aliases: string[];
}

function normalizeEntityName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandSearchTokens(term: string): string[] {
  const tokens = [term];
  const normalized = normalizeEntityName(term);
  tokens.push(normalized);

  // Expand common variations
  if (normalized.includes('oil filter') || normalized === 'filter oil') {
    tokens.push('hydraulic oil');
    tokens.push('filter');
  }
  if (normalized.includes('oil') && !normalized.includes('filter')) {
    tokens.push('huile');
    tokens.push('ölfilter');
  }

  return [...new Set(tokens)];
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

export async function queryCanonicalGraph(
  supabase: SupabaseClient,
  machineId: string,
  searchTerm: string
): Promise<CanonicalQueryResult> {
  const normSearchTerm = normalizeEntityName(searchTerm);

  // 1. Get all clusters for this machine
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
      confidence_summary: {
        total_matches: 0,
        avg_confidence: 'NONE',
        evidence_count: 0,
        link_count: 0,
      },
    };
  }

  const clusterIds = allClusters.map(c => c.id);

  // 2. Get aliases
  const { data: allAliases = [] } = await supabase
    .from('canonical_cluster_aliases')
    .select('cluster_id, alias')
    .in('cluster_id', clusterIds);

  const aliasesByClusterId: Record<string, string[]> = {};
  for (const alias of allAliases) {
    if (!aliasesByClusterId[alias.cluster_id]) {
      aliasesByClusterId[alias.cluster_id] = [];
    }
    aliasesByClusterId[alias.cluster_id].push(alias.alias);
  }

  // 3. Get members
  const { data: allMembers = [] } = await supabase
    .from('canonical_cluster_members')
    .select('cluster_id, source_entity_id, source_entity_type')
    .in('cluster_id', clusterIds);

  const membersByClusterId: Record<string, Array<{ source_entity_id: string; source_entity_type: string }>> = {};
  for (const member of allMembers) {
    if (!membersByClusterId[member.cluster_id]) {
      membersByClusterId[member.cluster_id] = [];
    }
    membersByClusterId[member.cluster_id].push({
      source_entity_id: member.source_entity_id,
      source_entity_type: member.source_entity_type,
    });
  }

  // 4. Match clusters - three levels
  const matchedClusterIds: string[] = [];

  // Level 1: Exact match on canonical name (normalized)
  for (const cluster of allClusters) {
    if (normalizeEntityName(cluster.canonical_name) === normSearchTerm) {
      matchedClusterIds.push(cluster.id);
    }
  }

  // Level 2: Alias match
  if (matchedClusterIds.length === 0) {
    for (const cluster of allClusters) {
      const aliases = aliasesByClusterId[cluster.id] || [];
      if (aliases.some(a => normalizeEntityName(a) === normSearchTerm)) {
        matchedClusterIds.push(cluster.id);
      }
    }
  }

  // Level 3: Normalized contains (prudent - only if search is 4+ chars and distance <= 2)
  if (matchedClusterIds.length === 0 && normSearchTerm.length >= 4) {
    for (const cluster of allClusters) {
      const normName = normalizeEntityName(cluster.canonical_name);
      const distance = levenshteinDistance(normName, normSearchTerm);
      if (distance <= 2) {
        matchedClusterIds.push(cluster.id);
      }
    }
  }

  // Level 4: Token match (for multi-word searches like "oil filter")
  if (matchedClusterIds.length === 0) {
    const tokens = normSearchTerm.split(' ').filter(t => t.length >= 4);
    if (tokens.length > 0) {
      for (const cluster of allClusters) {
        const normName = normalizeEntityName(cluster.canonical_name);
        const aliases = aliasesByClusterId[cluster.id] || [];
        for (const token of tokens) {
          if (normName.includes(token) || aliases.some(a => normalizeEntityName(a).includes(token))) {
            matchedClusterIds.push(cluster.id);
            break;
          }
        }
      }
    }
  }

  // Build detailed cluster info
  const matchedClusters = allClusters
    .filter(c => matchedClusterIds.includes(c.id))
    .map(c => ({
      id: c.id,
      canonical_name: c.canonical_name,
      cluster_type: c.cluster_type,
      confidence: c.confidence,
      member_count: (membersByClusterId[c.id] || []).length,
    }));

  // Get all aliases for matched clusters
  const matchedAliases: string[] = [];
  for (const cid of matchedClusterIds) {
    matchedAliases.push(...(aliasesByClusterId[cid] || []));
  }

  // 5. Get links for matched clusters
  const { data: outgoingLinks = [] } = await supabase
    .from('canonical_cluster_links')
    .select('from_cluster_id, to_cluster_id, link_type, c2:canonical_clusters!to_cluster_id(canonical_name, cluster_type)')
    .in('from_cluster_id', matchedClusterIds);

  const { data: incomingLinks = [] } = await supabase
    .from('canonical_cluster_links')
    .select('from_cluster_id, to_cluster_id, link_type, c1:canonical_clusters!from_cluster_id(canonical_name, cluster_type)')
    .in('to_cluster_id', matchedClusterIds);

  // Categorize links
  const linkedSystems: Array<{ name: string; link_type: string }> = [];
  const linkedParts: Array<{ name: string; link_type: string }> = [];
  const linkedMaintenanceTasks: Array<{ name: string; link_type: string }> = [];
  const linkedFaults: Array<{ name: string; link_type: string }> = [];
  const linkedRelated: Array<{ name: string; link_type: string }> = [];

  for (const link of outgoingLinks) {
    const targetName = link.c2?.canonical_name || 'unknown';
    const targetType = link.c2?.cluster_type || 'unknown';
    const linkInfo = { name: targetName, link_type: link.link_type };

    if (targetType === 'system') {
      linkedSystems.push(linkInfo);
    } else if (targetType === 'part') {
      linkedParts.push(linkInfo);
    } else if (targetType === 'maintenance_target') {
      linkedMaintenanceTasks.push(linkInfo);
    } else if (targetType === 'fault_target') {
      linkedFaults.push(linkInfo);
    } else {
      linkedRelated.push(linkInfo);
    }
  }

  for (const link of incomingLinks) {
    const sourceName = link.c1?.canonical_name || 'unknown';
    const sourceType = link.c1?.cluster_type || 'unknown';
    const linkInfo = { name: sourceName, link_type: `${link.link_type} (incoming)` };

    if (sourceType === 'system') {
      linkedSystems.push(linkInfo);
    } else if (sourceType === 'part') {
      linkedParts.push(linkInfo);
    } else if (sourceType === 'maintenance_target') {
      linkedMaintenanceTasks.push(linkInfo);
    } else if (sourceType === 'fault_target') {
      linkedFaults.push(linkInfo);
    } else {
      linkedRelated.push(linkInfo);
    }
  }

  // 6. Get evidence
  const evidence: Array<{ source_entity_id: string; source_entity_type: string; member_cluster_id: string }> = [];
  for (const cid of matchedClusterIds) {
    const members = membersByClusterId[cid] || [];
    for (const member of members) {
      evidence.push({
        source_entity_id: member.source_entity_id,
        source_entity_type: member.source_entity_type,
        member_cluster_id: cid,
      });
    }
  }

  // 7. Confidence summary
  const confidenceLevels: string[] = matchedClusters.map(c => c.confidence);
  const avgConfidence =
    confidenceLevels.length > 0
      ? confidenceLevels[0]
      : 'NONE';

  return {
    top_cluster: matchedClusters[0],
    matched_clusters: matchedClusters,
    aliases: matchedAliases,
    linked_systems: linkedSystems.slice(0, 10),
    linked_parts: linkedParts.slice(0, 10),
    linked_maintenance_tasks: linkedMaintenanceTasks.slice(0, 10),
    linked_faults: linkedFaults.slice(0, 10),
    linked_related_clusters: linkedRelated.slice(0, 10),
    evidence_refs: evidence,
    confidence_summary: {
      total_matches: matchedClusterIds.length,
      avg_confidence: avgConfidence,
      evidence_count: evidence.length,
      link_count: outgoingLinks.length + incomingLinks.length,
    },
  };
}
