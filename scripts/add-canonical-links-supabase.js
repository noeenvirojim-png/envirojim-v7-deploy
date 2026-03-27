/**
 * Add Canonical Links - Phase 5 (Supabase Admin Version)
 * Generates semantic links between clusters using Supabase admin client
 * Link rules:
 * 1. maintenance_target ----uses_part----> part
 * 2. maintenance_target ----maintains----> system
 * 3. fault_target ----related_fault----> maintenance_target
 * 4. part ----part_of----> system
 */

const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0';

const MACHINE_ID = '30000000-0000-0000-0000-111111111111';
const MAX_LINKS = 500;

// ============================================================================
// UTILITIES
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

function areNamesSimilar(name1, name2, threshold = 2) {
  const n1 = normalizeEntityName(name1);
  const n2 = normalizeEntityName(name2);
  if (n1 === n2) return true;
  const distance = levenshteinDistance(n1, n2);
  return distance <= threshold;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`[add-canonical-links] Connected to Supabase: ${SUPABASE_URL}`);

  try {
    // Load clusters
    const { data: clusters, error: clusterError } = await supabase
      .from('canonical_clusters')
      .select('id, machine_id, canonical_name, cluster_type, confidence')
      .eq('machine_id', MACHINE_ID)
      .order('cluster_type')
      .order('canonical_name');

    if (clusterError) throw clusterError;
    console.log(`[add-canonical-links] Loaded ${clusters.length} clusters`);

    // Load aliases
    const { data: aliasRows, error: aliasError } = await supabase
      .from('canonical_cluster_aliases')
      .select('cluster_id, alias')
      .in(
        'cluster_id',
        clusters.map(c => c.id)
      );

    if (aliasError) throw aliasError;

    const aliasesByClusterId = {};
    for (const row of aliasRows) {
      if (!aliasesByClusterId[row.cluster_id]) {
        aliasesByClusterId[row.cluster_id] = [];
      }
      aliasesByClusterId[row.cluster_id].push(row.alias);
    }
    console.log(`[add-canonical-links] Loaded ${aliasRows.length} aliases`);

    // Load members
    const { data: memberRows, error: memberError } = await supabase
      .from('canonical_cluster_members')
      .select('cluster_id, source_entity_id, source_entity_type')
      .in(
        'cluster_id',
        clusters.map(c => c.id)
      );

    if (memberError) throw memberError;
    console.log(`[add-canonical-links] Loaded ${memberRows.length} members`);

    // Build indices
    const clustersByType = {};
    const clusterById = {};
    for (const c of clusters) {
      if (!clustersByType[c.cluster_type]) {
        clustersByType[c.cluster_type] = [];
      }
      clustersByType[c.cluster_type].push(c);
      clusterById[c.id] = c;
    }

    console.log(`[add-canonical-links] Cluster types: ${Object.keys(clustersByType).join(', ')}`);

    // ========================================================================
    // GENERATE LINKS
    // ========================================================================

    const links = new Set();

    // Rule 1: maintenance_target uses part
    const maintenanceTargets = clustersByType['maintenance_target'] || [];
    const parts = clustersByType['part'] || [];
    for (const maint of maintenanceTargets) {
      for (const part of parts) {
        if (areNamesSimilar(maint.canonical_name, part.canonical_name, 3)) {
          const key = `${maint.id}|${part.id}|uses_part`;
          links.add(key);
        }
      }
    }
    console.log(`[add-canonical-links] Rule 1 (maintenance→part): ${links.size} links`);

    // Rule 2: maintenance_target maintains system
    const systems = clustersByType['system'] || [];
    for (const maint of maintenanceTargets) {
      for (const system of systems) {
        const n1 = normalizeEntityName(maint.canonical_name);
        const n2 = normalizeEntityName(system.canonical_name);
        if (n1.includes(n2) || n2.includes(n1) || levenshteinDistance(n1, n2) <= 1) {
          const key = `${maint.id}|${system.id}|maintains`;
          links.add(key);
        }
      }
    }
    console.log(`[add-canonical-links] Rule 2 (maintenance→system): ${links.size} links total`);

    // Rule 3: fault_target related to maintenance_target
    const faultTargets = clustersByType['fault_target'] || [];
    for (const fault of faultTargets) {
      for (const maint of maintenanceTargets) {
        if (areNamesSimilar(fault.canonical_name, maint.canonical_name, 2)) {
          const key = `${fault.id}|${maint.id}|related_fault`;
          links.add(key);
        }
      }
    }
    console.log(`[add-canonical-links] Rule 3 (fault→maintenance): ${links.size} links total`);

    // Rule 4: part part_of system
    for (const part of parts) {
      for (const system of systems) {
        const n1 = normalizeEntityName(part.canonical_name);
        const n2 = normalizeEntityName(system.canonical_name);
        if (n1.includes(n2)) {
          const key = `${part.id}|${system.id}|part_of`;
          links.add(key);
        }
      }
    }
    console.log(`[add-canonical-links] Rule 4 (part→system): ${links.size} links total`);

    assert(links.size <= MAX_LINKS, `Too many links: ${links.size} > ${MAX_LINKS}`);

    // ========================================================================
    // WRITE LINKS TO DATABASE
    // ========================================================================

    const linkArray = Array.from(links).map(key => {
      const [fromId, toId, linkType] = key.split('|');
      return {
        from_cluster_id: fromId,
        to_cluster_id: toId,
        link_type: linkType,
        confidence: 'medium',
      };
    });

    console.log(`\n[add-canonical-links] Writing ${linkArray.length} links to database...`);

    // Insert in batches to avoid overload
    const batchSize = 50;
    let linksWritten = 0;

    for (let i = 0; i < linkArray.length; i += batchSize) {
      const batch = linkArray.slice(i, Math.min(i + batchSize, linkArray.length));
      const { error } = await supabase.from('canonical_cluster_links').insert(batch);

      if (error) {
        // Check if it's a conflict (duplicate key) which is acceptable
        if (error.code === '23505' || error.message.includes('UNIQUE')) {
          console.log(`[add-canonical-links] Batch ${Math.floor(i / batchSize) + 1}: Some duplicates (OK)`);
        } else {
          console.error(`[add-canonical-links] Batch error:`, error.message);
        }
      } else {
        linksWritten += batch.length;
      }
    }

    console.log(`[add-canonical-links] Wrote ${linksWritten} new links`);

    // ========================================================================
    // VERIFY RESULTS
    // ========================================================================

    const { data: allLinks, error: linksError } = await supabase
      .from('canonical_cluster_links')
      .select('*')
      .in(
        'from_cluster_id',
        clusters.map(c => c.id)
      );

    if (linksError) throw linksError;

    // Aggregate by type
    const linksByType = {};
    const linksByConfidence = {};
    for (const link of allLinks) {
      linksByType[link.link_type] = (linksByType[link.link_type] || 0) + 1;
      linksByConfidence[link.confidence] = (linksByConfidence[link.confidence] || 0) + 1;
    }

    // Get top 10 links
    const { data: topLinks, error: topError } = await supabase
      .from('canonical_cluster_links')
      .select(`
        from_cluster_id,
        to_cluster_id,
        link_type,
        confidence,
        c1:canonical_clusters!from_cluster_id(canonical_name),
        c2:canonical_clusters!to_cluster_id(canonical_name)
      `)
      .in(
        'from_cluster_id',
        clusters.map(c => c.id)
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (topError) throw topError;

    // ========================================================================
    // REPORT
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('[CANONICAL LINKS - PHASE 5 COMPLETE]');
    console.log('='.repeat(80));

    console.log(`\nMachine: ${MACHINE_ID}`);
    console.log(`Total Clusters: ${clusters.length}`);
    console.log(`Total Links: ${allLinks.length}`);

    console.log(`\nLinks by Type:`);
    for (const [type, count] of Object.entries(linksByType)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log(`\nLinks by Confidence:`);
    for (const [conf, count] of Object.entries(linksByConfidence)) {
      console.log(`  ${conf}: ${count}`);
    }

    console.log(`\nTop 10 Links (most recent):`);
    for (let i = 0; i < topLinks.length; i++) {
      const link = topLinks[i];
      const fromName = link.c1?.canonical_name || 'unknown';
      const toName = link.c2?.canonical_name || 'unknown';
      console.log(`  ${i + 1}. ${fromName} --[${link.link_type}]--> ${toName} (${link.confidence})`);
    }

    // ========================================================================
    // COHERENCE CHECK
    // ========================================================================

    console.log(`\nCanonical Graph Coherence:`);
    console.log(`  Total clusters: ${clusters.length}`);
    console.log(`  Total members: ${memberRows.length}`);
    console.log(`  Total aliases: ${aliasRows.length}`);
    console.log(`  Total links: ${allLinks.length}`);
    console.log(`  Average links per cluster: ${(allLinks.length / clusters.length).toFixed(2)}`);

    console.log('\n' + '='.repeat(80));
    console.log('RESULT: ✓ Canonical link generation complete');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('[add-canonical-links] FATAL ERROR:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
