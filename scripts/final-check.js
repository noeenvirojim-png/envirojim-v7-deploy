const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

const MID = '30000000-0000-0000-0000-111111111111';

(async () => {
  try {
    const cids = (await supabase.from('canonical_clusters').select('id').eq('machine_id', MID)).data.map(x => x.id);
    
    const { count: cc } = await supabase.from('canonical_clusters').select('*', { count: 'exact', head: true }).eq('machine_id', MID);
    const { count: mc } = await supabase.from('canonical_cluster_members').select('*', { count: 'exact', head: true }).in('cluster_id', cids);
    const { count: ac } = await supabase.from('canonical_cluster_aliases').select('*', { count: 'exact', head: true }).in('cluster_id', cids);
    const { data: links } = await supabase.from('canonical_cluster_links').select(`id, from_cluster_id, to_cluster_id, link_type, c1:canonical_clusters!from_cluster_id(canonical_name), c2:canonical_clusters!to_cluster_id(canonical_name)`).in('from_cluster_id', cids);
    
    const lc = links.length;
    const byType = {};
    links.forEach(l => byType[l.link_type] = (byType[l.link_type] || 0) + 1);
    
    const degree = {};
    links.forEach(l => {
      degree[l.from_cluster_id] = (degree[l.from_cluster_id] || 0) + 1;
      degree[l.to_cluster_id] = (degree[l.to_cluster_id] || 0) + 1;
    });
    const hubs = Object.entries(degree).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const hubData = [];
    for (const [cid, cnt] of hubs) {
      const c = (await supabase.from('canonical_clusters').select('canonical_name, cluster_type').eq('id', cid).single()).data;
      hubData.push({ name: c?.canonical_name || 'unknown', type: c?.cluster_type || '?', degree: cnt });
    }
    
    const first10 = links.slice(0, 10).map(l => ({
      from: l.c1?.canonical_name || '?',
      type: l.link_type,
      to: l.c2?.canonical_name || '?'
    }));
    
    console.log('## RESULT\n');
    console.log(`- graph_verified_for_real: ${lc === 66 ? 'YES' : 'NO'}`);
    console.log(`- clusters_count: ${cc}`);
    console.log(`- members_count: ${mc}`);
    console.log(`- aliases_count: ${ac}`);
    console.log(`- links_count: ${lc}`);
    console.log(`- link_count_by_type: ${JSON.stringify(byType)}`);
    console.log(`- top_10_hub_clusters:`);
    hubData.forEach((h, i) => console.log(`  ${i+1}. [${h.type}] ${h.name} (${h.degree})`));
    console.log(`- first_10_links:`);
    first10.forEach((l, i) => console.log(`  ${i+1}. ${l.from} --[${l.type}]--> ${l.to}`));
    console.log(`- coherence_check: ${mc === 233 && cc === 171 && lc === 66 ? 'PASS' : 'FAIL'}`);
    console.log('\n## CHANGED\n- none\n');
    console.log('## BLOCKERS\n- none');
  } catch (e) {
    console.log('## BLOCKERS\n- ' + e.message);
  }
})();
