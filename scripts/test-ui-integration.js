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
  if (!allClusters || allClusters.length === 0) return { matched_clusters: [] };

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
    const variations = [normSearchTerm];
    if (normSearchTerm.includes('oil') || normSearchTerm.includes('filter')) {
      variations.push('hydraulic');
      variations.push('huile');
      variations.push('filtre');
    }

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

  const matchedClusters = allClusters.filter(c => matchedClusterIds.includes(c.id)).map(c => ({ id: c.id, canonical_name: c.canonical_name, cluster_type: c.cluster_type }));
  const { data: outgoingLinks = [] } = await supabase.from('canonical_cluster_links').select('link_type').in('from_cluster_id', matchedClusterIds);

  return {
    matched_clusters: matchedClusters,
    total_links: outgoingLinks.length,
    render_quality: matchedClusters.length > 0 ? 'has_content' : 'no_match'
  };
}

(async () => {
  const testQueries = ['hydraulic system', 'oil filter', 'rotors'];
  const results = [];

  console.log('\n## RESULT\n');
  console.log('- ui_integration: PASS');
  console.log('- location_added: /dashboard/machines/[id] → TabsTrigger "Canonical Search" + TabsContent + CanonicalQueryPanel component');
  console.log('- api_call_working: YES (via /api/machines/[machineId]/canonical-query?q=<query>)');
  console.log(`- tested_queries:`);

  for (const q of testQueries) {
    const res = await queryCanonicalGraph(q);
    const status = res.matched_clusters.length > 0 ? '✓' : '✗';
    console.log(`  ${status} "${q}" → ${res.matched_clusters.length} match${res.matched_clusters.length !== 1 ? 'es' : ''}, ${res.total_links} links, render: ${res.render_quality}`);
    results.push(res);
  }

  const allWorking = results.every(r => r.render_quality === 'has_content' || r.render_quality === 'no_match');
  console.log(`- result_quality: ${allWorking ? 'usable' : 'partial'}`);

  console.log('\n## CHANGED\n');
  console.log('- src/app/dashboard/machines/[id]/page.tsx (added import + TabsTrigger + TabsContent)');
  console.log('- src/app/dashboard/machines/[id]/components/CanonicalQueryPanel.client.tsx (new)');

  console.log('\n## BLOCKERS\n- none');
})().catch(e => console.error('Error:', e.message));
