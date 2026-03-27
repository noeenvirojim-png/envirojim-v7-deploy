const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Copy the endpoint logic
function normalizeEntityName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a, b) {
  const aLen = a.length;
  const bLen = b.length;
  const dp = Array(aLen + 1)
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

async function queryCanonicalGraph(supabase, machineId, searchTerm) {
  const normSearchTerm = normalizeEntityName(searchTerm);

  const { data: allClusters } = await supabase
    .from('canonical_clusters')
    .select('id, canonical_name, cluster_type, confidence')
    .eq('machine_id', machineId);

  if (!allClusters || allClusters.length === 0) {
    return { error: 'No clusters found' };
  }

  const clusterIds = allClusters.map(c => c.id);

  // Get aliases and members
  const [{ data: allAliases = [] }, { data: allMembers = [] }] = await Promise.all([
    supabase.from('canonical_cluster_aliases').select('cluster_id, alias').in('cluster_id', clusterIds),
    supabase.from('canonical_cluster_members').select('cluster_id, source_entity_id, source_entity_type').in('cluster_id', clusterIds)
  ]);

  const aliasesByClusterId = {};
  for (const alias of allAliases) {
    if (!aliasesByClusterId[alias.cluster_id]) aliasesByClusterId[alias.cluster_id] = [];
    aliasesByClusterId[alias.cluster_id].push(alias.alias);
  }

  const membersByClusterId = {};
  for (const member of allMembers) {
    if (!membersByClusterId[member.cluster_id]) membersByClusterId[member.cluster_id] = [];
    membersByClusterId[member.cluster_id].push({
      source_entity_id: member.source_entity_id,
      source_entity_type: member.source_entity_type
    });
  }

  // Match
  let matchedClusterIds = [];

  for (const cluster of allClusters) {
    if (normalizeEntityName(cluster.canonical_name) === normSearchTerm) {
      matchedClusterIds.push(cluster.id);
    }
  }

  if (matchedClusterIds.length === 0) {
    for (const cluster of allClusters) {
      const aliases = aliasesByClusterId[cluster.id] || [];
      if (aliases.some(a => normalizeEntityName(a) === normSearchTerm)) {
        matchedClusterIds.push(cluster.id);
      }
    }
  }

  const matchedClusters = allClusters
    .filter(c => matchedClusterIds.includes(c.id))
    .map(c => ({
      id: c.id,
      canonical_name: c.canonical_name,
      cluster_type: c.cluster_type,
      confidence: c.confidence,
      member_count: (membersByClusterId[c.id] || []).length
    }));

  const matchedAliases = [];
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

  const linkedSystems = [];
  const linkedParts = [];
  const linkedMaintenance = [];
  const linkedFaults = [];
  const linkedRelated = [];

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

  const evidence = [];
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
    evidence_refs: evidence,
    confidence_summary: {
      total_matches: matchedClusterIds.length,
      avg_confidence: avgConfidence,
      evidence_count: evidence.length,
      link_count: outgoingLinks.length + incomingLinks.length
    }
  };
}

(async () => {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const titanId = 'f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8';

  console.log('=== TESTING ENDPOINT LOGIC DIRECTLY ===\n');

  // Test query
  const result = await queryCanonicalGraph(supabase, titanId, 'pressure valve');
  
  console.log('Result:', JSON.stringify(result, null, 2));

  // Check if UI expectations are met
  console.log('\n=== UI COMPATIBILITY ===');
  console.log(`✓ top_cluster exists: ${result.top_cluster ? '✓' : '✗'}`);
  console.log(`✓ top_cluster.canonical_name: ${result.top_cluster?.canonical_name}`);
  console.log(`✓ linked_parts is array: ${Array.isArray(result.linked_parts) ? '✓' : '✗'}`);
  console.log(`✓ linked_maintenance_tasks is array: ${Array.isArray(result.linked_maintenance_tasks) ? '✓' : '✗'}`);
  console.log(`✓ linked_faults is array: ${Array.isArray(result.linked_faults) ? '✓' : '✗'}`);
  console.log(`✓ evidence_refs is array: ${Array.isArray(result.evidence_refs) ? '✓' : '✗'}`);

  if (result.top_cluster && result.linked_parts !== undefined && result.linked_maintenance_tasks !== undefined) {
    console.log('\n✅ ENDPOINT RESPONSE FORMAT IS CORRECT FOR UI');
  } else {
    console.log('\n❌ ENDPOINT RESPONSE FORMAT ISSUE');
  }
})();
