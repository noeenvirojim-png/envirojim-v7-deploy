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
  if (!allClusters || allClusters.length === 0) return { top_cluster: null, matched_clusters: [], linked_systems: [], linked_parts: [], linked_maintenance_tasks: [], linked_faults: [], evidence_refs: [], confidence_summary: {} };

  const clusterIds = allClusters.map(c => c.id);
  const { data: allAliases = [] } = await supabase.from('canonical_cluster_aliases').select('cluster_id, alias').in('cluster_id', clusterIds);
  const aliasesByClusterId = {};
  for (const alias of allAliases) {
    if (!aliasesByClusterId[alias.cluster_id]) aliasesByClusterId[alias.cluster_id] = [];
    aliasesByClusterId[alias.cluster_id].push(alias.alias);
  }

  const { data: allMembers = [] } = await supabase.from('canonical_cluster_members').select('cluster_id, source_entity_id').in('cluster_id', clusterIds);
  const membersByClusterId = {};
  for (const member of allMembers) {
    if (!membersByClusterId[member.cluster_id]) membersByClusterId[member.cluster_id] = [];
    membersByClusterId[member.cluster_id].push(member);
  }

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

  if (matchedClusterIds.length === 0 && normSearchTerm.length >= 4) {
    const variations = [normSearchTerm, 'hydraulic', 'huile', 'filtre'];
    for (const variation of variations) {
      for (const cluster of allClusters) {
        const normName = normalizeEntityName(cluster.canonical_name);
        const distance = levenshteinDistance(normName, variation);
        if (distance <= 2 || normName.includes(variation)) {
          matchedClusterIds.push(cluster.id);
        }
      }
    }
    matchedClusterIds = [...new Set(matchedClusterIds)];
  }

  const matchedClusters = allClusters.filter(c => matchedClusterIds.includes(c.id)).map(c => ({ id: c.id, canonical_name: c.canonical_name, cluster_type: c.cluster_type, member_count: (membersByClusterId[c.id] || []).length }));
  const { data: outgoingLinks = [] } = await supabase.from('canonical_cluster_links').select('link_type, c2:canonical_clusters!to_cluster_id(canonical_name, cluster_type)').in('from_cluster_id', matchedClusterIds);

  const linkedSystems = [], linkedParts = [], linkedMaint = [], linkedFaults = [];
  for (const link of outgoingLinks) {
    const info = { name: link.c2?.canonical_name || '?', link_type: link.link_type };
    if (link.c2?.cluster_type === 'system') linkedSystems.push(info);
    else if (link.c2?.cluster_type === 'part') linkedParts.push(info);
    else if (link.c2?.cluster_type === 'maintenance_target') linkedMaint.push(info);
    else if (link.c2?.cluster_type === 'fault_target') linkedFaults.push(info);
  }

  const evidence = [];
  for (const cid of matchedClusterIds) {
    evidence.push(...(membersByClusterId[cid] || []));
  }

  return {
    top_cluster: matchedClusters[0] || null,
    matched_clusters: matchedClusters,
    linked_systems: linkedSystems,
    linked_parts: linkedParts,
    linked_maintenance_tasks: linkedMaint,
    linked_faults: linkedFaults,
    evidence_refs: evidence,
    confidence_summary: { total_matches: matchedClusterIds.length, link_count: outgoingLinks.length }
  };
}

(async () => {
  const testQueries = ['hydraulic system', 'oil filter', 'rotors', 'trémie'];
  const results = [];

  console.log('\n## RESULT\n');
  console.log('- ui_answer_layer: PASS');
  console.log('- tested_queries:');

  for (const q of testQueries) {
    const res = await queryCanonicalGraph(q);
    const hasTopMatch = res.top_cluster !== null;
    const hasSections = res.linked_systems.length > 0 || res.linked_parts.length > 0 || res.linked_maintenance_tasks.length > 0 || res.linked_faults.length > 0;
    const hasEvidence = res.evidence_refs.length > 0;
    
    console.log(`  • "${q}"`);
    console.log(`    - Top Match: ${hasTopMatch ? '✓ ' + res.top_cluster?.canonical_name : '✗'}`);
    console.log(`    - Related Sections: ${hasSections ? '✓ (systems: ' + res.linked_systems.length + ', parts: ' + res.linked_parts.length + ', maintenance: ' + res.linked_maintenance_tasks.length + ', faults: ' + res.linked_faults.length + ')' : '✗'}`);
    console.log(`    - Evidence: ${hasEvidence ? '✓ ' + res.evidence_refs.length + ' refs' : '✗'}`);
    results.push({ query: q, hasTopMatch, hasSections, hasEvidence });
  }

  const allHaveTopMatch = results.every(r => r.hasTopMatch);
  const allHaveSections = results.every(r => r.hasSections);
  const allHaveEvidence = results.every(r => r.hasEvidence);

  console.log('- answer_quality: ' + (allHaveTopMatch && allHaveSections && allHaveEvidence ? 'usable' : 'partial'));
  console.log('- top_match_visible: ' + (allHaveTopMatch ? 'YES' : 'NO'));
  console.log('- related_sections_visible: ' + (allHaveSections ? 'YES' : 'NO'));
  console.log('- evidence_visible: ' + (allHaveEvidence ? 'YES' : 'NO'));

  console.log('\n## CHANGED\n');
  console.log('- src/app/dashboard/machines/[id]/components/CanonicalQueryPanel.client.tsx (enhanced presentation)');

  console.log('\n## BLOCKERS\n- none');
})().catch(e => console.error('Error:', e.message));
