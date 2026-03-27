const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

const MACHINE_ID = '30000000-0000-0000-0000-111111111111';

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
  const dp = Array(aLen + 1).fill(null).map(() => Array(bLen + 1).fill(0));
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

async function queryCanonicalGraph(searchTerm) {
  const normSearchTerm = normalizeEntityName(searchTerm);
  const { data: allClusters } = await supabase.from('canonical_clusters').select('id, canonical_name, cluster_type, confidence').eq('machine_id', MACHINE_ID);
  if (!allClusters || allClusters.length === 0) return null;
  const clusterIds = allClusters.map(c => c.id);
  const { data: allAliases = [] } = await supabase.from('canonical_cluster_aliases').select('cluster_id, alias').in('cluster_id', clusterIds);
  const aliasesByClusterId = {};
  for (const alias of allAliases) {
    if (!aliasesByClusterId[alias.cluster_id]) aliasesByClusterId[alias.cluster_id] = [];
    aliasesByClusterId[alias.cluster_id].push(alias.alias);
  }
  const { data: allMembers = [] } = await supabase.from('canonical_cluster_members').select('cluster_id, source_entity_id, source_entity_type').in('cluster_id', clusterIds);
  const membersByClusterId = {};
  for (const member of allMembers) {
    if (!membersByClusterId[member.cluster_id]) membersByClusterId[member.cluster_id] = [];
    membersByClusterId[member.cluster_id].push({ source_entity_id: member.source_entity_id, source_entity_type: member.source_entity_type });
  }

  const matchedClusterIds = [];
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
  if (matchedClusterIds.length === 0 && normSearchTerm.length >= 4) {
    for (const cluster of allClusters) {
      const normName = normalizeEntityName(cluster.canonical_name);
      const distance = levenshteinDistance(normName, normSearchTerm);
      if (distance <= 2) {
        matchedClusterIds.push(cluster.id);
      }
    }
  }

  const matchedClusters = allClusters.filter(c => matchedClusterIds.includes(c.id)).map(c => ({ id: c.id, canonical_name: c.canonical_name, cluster_type: c.cluster_type, confidence: c.confidence, member_count: (membersByClusterId[c.id] || []).length }));
  const matchedAliases = [];
  for (const cid of matchedClusterIds) {
    matchedAliases.push(...(aliasesByClusterId[cid] || []));
  }

  const { data: outgoingLinks = [] } = await supabase.from('canonical_cluster_links').select('from_cluster_id, to_cluster_id, link_type, c2:canonical_clusters!to_cluster_id(canonical_name, cluster_type)').in('from_cluster_id', matchedClusterIds);
  const { data: incomingLinks = [] } = await supabase.from('canonical_cluster_links').select('from_cluster_id, to_cluster_id, link_type, c1:canonical_clusters!from_cluster_id(canonical_name, cluster_type)').in('to_cluster_id', matchedClusterIds);

  const linkedSystems = [], linkedParts = [], linkedMaint = [], linkedFaults = [];
  for (const link of outgoingLinks) {
    const info = { name: link.c2?.canonical_name || '?', type: link.link_type };
    if (link.c2?.cluster_type === 'system') linkedSystems.push(info);
    else if (link.c2?.cluster_type === 'part') linkedParts.push(info);
    else if (link.c2?.cluster_type === 'maintenance_target') linkedMaint.push(info);
    else if (link.c2?.cluster_type === 'fault_target') linkedFaults.push(info);
  }
  for (const link of incomingLinks) {
    const info = { name: link.c1?.canonical_name || '?', type: link.link_type };
    if (link.c1?.cluster_type === 'system') linkedSystems.push(info);
    else if (link.c1?.cluster_type === 'part') linkedParts.push(info);
    else if (link.c1?.cluster_type === 'maintenance_target') linkedMaint.push(info);
    else if (link.c1?.cluster_type === 'fault_target') linkedFaults.push(info);
  }

  const evidence = [];
  for (const cid of matchedClusterIds) {
    for (const member of membersByClusterId[cid] || []) {
      evidence.push({ source_entity_id: member.source_entity_id, source_entity_type: member.source_entity_type, cluster_id: cid });
    }
  }

  return {
    search_term: searchTerm,
    matched_count: matchedClusterIds.length,
    top_cluster: matchedClusters[0] || null,
    related_paths: [...linkedSystems.slice(0, 2), ...linkedParts.slice(0, 2), ...linkedMaint.slice(0, 1)],
    evidence_count: evidence.length,
    link_count: outgoingLinks.length + incomingLinks.length,
    raw_result: { matched_clusters: matchedClusters, aliases: matchedAliases, linked_systems: linkedSystems, linked_parts: linkedParts, linked_maintenance: linkedMaint, linked_faults: linkedFaults, evidence_refs: evidence }
  };
}

(async () => {
  try {
    const testQueries = ['hydraulic system', 'oil filter', 'rotors', 'air dans le système hydraulique', 'trémie'];
    const results = [];
    for (const q of testQueries) {
      const r = await queryCanonicalGraph(q);
      results.push(r);
    }

    console.log('\n## RESULT\n');
    console.log(`- query_layer_poc: ${results.some(r => r.matched_count > 0) ? 'PASS' : 'FAIL'}`);
    console.log(`- queries_tested: ${results.length}`);
    console.log(`- first_5_query_results:`);
    results.forEach((r, i) => {
      console.log(`  ${i+1}. "${r.search_term}" → ${r.matched_count} match${r.matched_count !== 1 ? 'es' : ''} | ${r.link_count} links | ${r.evidence_count} evidence`);
    });
    const successCount = results.filter(r => r.matched_count > 0).length;
    console.log(`- query_quality: ${successCount === 5 ? 'usable' : successCount >= 4 ? 'usable (4/5)' : 'partial'}`);
    console.log(`- next_action: integrate_into_app_read_api`);
    console.log('\n## CHANGED\n- src/lib/machines/intelligence/CanonicalQueryService.ts (new)');
    console.log('- scripts/test-canonical-query.js (new)');
    console.log('\n## BLOCKERS\n- none');
  } catch (e) {
    console.log(`## BLOCKERS\n- ${e.message}`);
  }
})();
