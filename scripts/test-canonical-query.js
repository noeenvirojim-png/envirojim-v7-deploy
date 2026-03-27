/**
 * Canonical Query Service - Test POC
 * Test 5 real queries on VB750 canonical graph
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

const MACHINE_ID = '30000000-0000-0000-0000-111111111111';

// ============================================================================
// CANONICAL QUERY SERVICE
// ============================================================================

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

  // Get all clusters for this machine
  const { data: allClusters } = await supabase
    .from('canonical_clusters')
    .select('id, canonical_name, cluster_type, confidence')
    .eq('machine_id', MACHINE_ID);

  if (!allClusters || allClusters.length === 0) {
    return { matched_clusters: [], aliases: [], linked_systems: [], linked_parts: [], linked_maintenance_tasks: [], linked_faults: [], linked_related_clusters: [], evidence_refs: [], confidence_summary: { total_matches: 0, avg_confidence: 'NONE', evidence_count: 0, link_count: 0 } };
  }

  const clusterIds = allClusters.map(c => c.id);

  // Get aliases
  const { data: allAliases = [] } = await supabase
    .from('canonical_cluster_aliases')
    .select('cluster_id, alias')
    .in('cluster_id', clusterIds);

  const aliasesByClusterId = {};
  for (const alias of allAliases) {
    if (!aliasesByClusterId[alias.cluster_id]) aliasesByClusterId[alias.cluster_id] = [];
    aliasesByClusterId[alias.cluster_id].push(alias.alias);
  }

  // Get members
  const { data: allMembers = [] } = await supabase
    .from('canonical_cluster_members')
    .select('cluster_id, source_entity_id, source_entity_type')
    .in('cluster_id', clusterIds);

  const membersByClusterId = {};
  for (const member of allMembers) {
    if (!membersByClusterId[member.cluster_id]) membersByClusterId[member.cluster_id] = [];
    membersByClusterId[member.cluster_id].push({ source_entity_id: member.source_entity_id, source_entity_type: member.source_entity_type });
  }

  // Match clusters
  const matchedClusterIds = [];

  // Level 1: Exact match
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

  // Level 3: Normalized contains
  if (matchedClusterIds.length === 0 && normSearchTerm.length >= 4) {
    for (const cluster of allClusters) {
      const normName = normalizeEntityName(cluster.canonical_name);
      const distance = levenshteinDistance(normName, normSearchTerm);
      if (distance <= 2) {
        matchedClusterIds.push(cluster.id);
      }
    }
  }

  // Build matched clusters
  const matchedClusters = allClusters
    .filter(c => matchedClusterIds.includes(c.id))
    .map(c => ({ id: c.id, canonical_name: c.canonical_name, cluster_type: c.cluster_type, confidence: c.confidence, member_count: (membersByClusterId[c.id] || []).length }));

  // Get aliases
  const matchedAliases = [];
  for (const cid of matchedClusterIds) {
    matchedAliases.push(...(aliasesByClusterId[cid] || []));
  }

  // Get links
  const { data: outgoingLinks = [] } = await supabase
    .from('canonical_cluster_links')
    .select('from_cluster_id, to_cluster_id, link_type, c2:canonical_clusters!to_cluster_id(canonical_name, cluster_type)')
    .in('from_cluster_id', matchedClusterIds);

  const { data: incomingLinks = [] } = await supabase
    .from('canonical_cluster_links')
    .select('from_cluster_id, to_cluster_id, link_type, c1:canonical_clusters!from_cluster_id(canonical_name, cluster_type)')
    .in('to_cluster_id', matchedClusterIds);

  // Categorize links
  const linkedSystems = [];
  const linkedParts = [];
  const linkedMaintenanceTasks = [];
  const linkedFaults = [];
  const linkedRelated = [];

  for (const link of outgoingLinks) {
    const targetName = link.c2?.canonical_name || 'unknown';
    const targetType = link.c2?.cluster_type || 'unknown';
    const linkInfo = { name: targetName, link_type: link.link_type };
    if (targetType === 'system') linkedSystems.push(linkInfo);
    else if (targetType === 'part') linkedParts.push(linkInfo);
    else if (targetType === 'maintenance_target') linkedMaintenanceTasks.push(linkInfo);
    else if (targetType === 'fault_target') linkedFaults.push(linkInfo);
    else linkedRelated.push(linkInfo);
  }

  for (const link of incomingLinks) {
    const sourceName = link.c1?.canonical_name || 'unknown';
    const sourceType = link.c1?.cluster_type || 'unknown';
    const linkInfo = { name: sourceName, link_type: link.link_type };
    if (sourceType === 'system') linkedSystems.push(linkInfo);
    else if (sourceType === 'part') linkedParts.push(linkInfo);
    else if (sourceType === 'maintenance_target') linkedMaintenanceTasks.push(linkInfo);
    else if (sourceType === 'fault_target') linkedFaults.push(linkInfo);
    else linkedRelated.push(linkInfo);
  }

  // Get evidence
  const evidence = [];
  for (const cid of matchedClusterIds) {
    const members = membersByClusterId[cid] || [];
    for (const member of members) {
      evidence.push({ source_entity_id: member.source_entity_id, source_entity_type: member.source_entity_type, member_cluster_id: cid });
    }
  }

  const avgConfidence = matchedClusters.length > 0 ? matchedClusters[0].confidence : 'NONE';

  return {
    matched_clusters: matchedClusters,
    aliases: matchedAliases,
    linked_systems: linkedSystems.slice(0, 5),
    linked_parts: linkedParts.slice(0, 5),
    linked_maintenance_tasks: linkedMaintenanceTasks.slice(0, 5),
    linked_faults: linkedFaults.slice(0, 5),
    linked_related_clusters: linkedRelated.slice(0, 5),
    evidence_refs: evidence,
    confidence_summary: { total_matches: matchedClusterIds.length, avg_confidence: avgConfidence, evidence_count: evidence.length, link_count: outgoingLinks.length + incomingLinks.length }
  };
}

// ============================================================================
// TEST QUERIES
// ============================================================================

async function runTests() {
  const testQueries = [
    'hydraulic system',
    'oil filter',
    'rotors',
    'air dans le système hydraulique',
    'trémie'
  ];

  console.log('\n' + '='.repeat(100));
  console.log('CANONICAL QUERY SERVICE - TEST RESULTS');
  console.log('='.repeat(100) + '\n');

  const results = [];

  for (const query of testQueries) {
    console.log(`\n📌 Query: "${query}"`);
    console.log('─'.repeat(100));

    const result = await queryCanonicalGraph(query);
    results.push({ query, result });

    console.log(`Matched clusters: ${result.matched_clusters.length}`);
    if (result.matched_clusters.length > 0) {
      for (const cluster of result.matched_clusters) {
        console.log(`  • [${cluster.cluster_type.padEnd(18)}] ${cluster.canonical_name} (members: ${cluster.member_count}, conf: ${cluster.confidence})`);
      }
    } else {
      console.log('  (no matches)');
    }

    if (result.aliases.length > 0) {
      console.log(`\nAliases (${result.aliases.length}):`);
      result.aliases.forEach(a => console.log(`  • ${a}`));
    }

    if (result.linked_systems.length > 0) {
      console.log(`\nLinked Systems (${result.linked_systems.length}):`);
      result.linked_systems.slice(0, 3).forEach(s => console.log(`  • ${s.name} [${s.link_type}]`));
    }

    if (result.linked_parts.length > 0) {
      console.log(`\nLinked Parts (${result.linked_parts.length}):`);
      result.linked_parts.slice(0, 3).forEach(p => console.log(`  • ${p.name} [${p.link_type}]`));
    }

    if (result.linked_maintenance_tasks.length > 0) {
      console.log(`\nLinked Maintenance (${result.linked_maintenance_tasks.length}):`);
      result.linked_maintenance_tasks.slice(0, 3).forEach(m => console.log(`  • ${m.name} [${m.link_type}]`));
    }

    if (result.linked_faults.length > 0) {
      console.log(`\nLinked Faults (${result.linked_faults.length}):`);
      result.linked_faults.slice(0, 3).forEach(f => console.log(`  • ${f.name} [${f.link_type}]`));
    }

    console.log(`\nEvidence: ${result.confidence_summary.evidence_count} source entities | Links: ${result.confidence_summary.link_count}`);
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log('\n' + '='.repeat(100));
  console.log('TEST SUMMARY');
  console.log('='.repeat(100) + '\n');

  let successCount = 0;
  let avgMatchCount = 0;
  let avgLinkCount = 0;

  for (const { query, result } of results) {
    const success = result.matched_clusters.length > 0 ? '✓' : '✗';
    console.log(`${success} "${query}" → ${result.matched_clusters.length} clusters, ${result.confidence_summary.link_count} links`);
    if (result.matched_clusters.length > 0) successCount++;
    avgMatchCount += result.matched_clusters.length;
    avgLinkCount += result.confidence_summary.link_count;
  }

  console.log('\n📊 Quality Metrics:');
  console.log(`  Queries with results: ${successCount}/${testQueries.length}`);
  console.log(`  Average matches: ${(avgMatchCount / testQueries.length).toFixed(1)}`);
  console.log(`  Average links: ${(avgLinkCount / testQueries.length).toFixed(1)}`);
  console.log(`  Query quality: ${successCount === testQueries.length ? 'PASS (all queries matched)' : 'PARTIAL'}`);

  console.log('\n' + '='.repeat(100));
}

runTests().catch(err => console.error('Error:', err.message));
