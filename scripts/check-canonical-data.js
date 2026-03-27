const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0', {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
  console.log('Checking canonical tables...\n');

  // Check canonical_clusters
  const { data: clusters, error: e1 } = await supabase
    .from('canonical_clusters')
    .select('count', { count: 'exact' });
  
  if (e1) {
    console.log('❌ canonical_clusters query error:', e1.message);
  } else {
    console.log('✓ canonical_clusters exists, row count:', clusters.length ? 'unable to count' : '0');
  }

  // Try a direct count query
  const { data: clusterCount, error: e2 } = await supabase.rpc('count_table', { table_name: 'canonical_clusters' });
  if (!e2) {
    console.log('  Direct count:', clusterCount);
  }

  // Check canonical_cluster_aliases
  const { data: aliases, error: e3 } = await supabase
    .from('canonical_cluster_aliases')
    .select('*')
    .limit(1);
  
  if (e3) {
    console.log('❌ canonical_cluster_aliases query error:', e3.message);
  } else {
    console.log('✓ canonical_cluster_aliases exists:', aliases ? 'OK' : 'empty');
  }

  // Check canonical_cluster_members
  const { data: members, error: e4 } = await supabase
    .from('canonical_cluster_members')
    .select('*')
    .limit(1);
  
  if (e4) {
    console.log('❌ canonical_cluster_members query error:', e4.message);
  } else {
    console.log('✓ canonical_cluster_members exists:', members ? 'OK' : 'empty');
  }

  // Try to list all tables
  console.log('\nChecking available tables...');
  const { data: tables, error: e5 } = await supabase.rpc('get_tables');
  if (e5) {
    console.log('rpc error:', e5.message);
    // Fallback: try to get from information_schema directly
    const { data: allTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(50);
    
    if (allTables) {
      const tableNames = allTables.map(t => t.table_name).sort();
      const canonicalTables = tableNames.filter(t => t.includes('canonical'));
      console.log('Canonical tables found:', canonicalTables.length > 0 ? canonicalTables : 'none');
      console.log('All public tables sample:', tableNames.slice(0, 15));
    }
  }
}

check().catch(err => console.error('Fatal error:', err.message));
