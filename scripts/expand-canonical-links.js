/**
 * Expand Canonical Links - Phase 5b
 * Generate additional semantic links using relaxed rules
 * Adds: part relationships, component containment, related maintenance/faults
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.ENRFwDnwh8TYL14sws85HmY19NZlgdXyC6LKSuDLma0';
const MACHINE_ID = '30000000-0000-0000-0000-111111111111';

// Utilities
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

function areNamesRelated(name1, name2) {
  // Checks if names share significant substrings (more lenient than Levenshtein)
  const n1 = normalizeEntityName(name1);
  const n2 = normalizeEntityName(name2);

  // Exact match
  if (n1 === n2) return true;

  // Substring match (one contains the other)
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Shared significant word (3+ chars)
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);

  for (const w1 of words1) {
    if (w1.length >= 3) {
      for (const w2 of words2) {
        if (w1 === w2) return true;
        // Allow partial word match if 80%+ of longer word
        const maxLen = Math.max(w1.length, w2.length);
        const dist = levenshteinDistance(w1, w2);
        if (dist / maxLen < 0.2) return true;
      }
    }
  }

  return false;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[expand-canonical-links] Connected to Supabase: ${SUPABASE_URL}`);

  try {
    // Load all clusters with their members and aliases
    const { data: clusters } = await supabase
      .from('canonical_clusters')
      .select('id, machine_id, canonical_name, cluster_type')
      .eq('machine_id', MACHINE_ID)
      .order('cluster_type')
      .order('canonical_name');

    console.log(`[expand-canonical-links] Loaded ${clusters.length} clusters`);

    const { data: members } = await supabase
      .from('canonical_cluster_members')
      .select('cluster_id, source_entity_id, source_entity_type')
      .in('cluster_id', clusters.map(c => c.id));

    const { data: aliases } = await supabase
      .from('canonical_cluster_aliases')
      .select('cluster_id, alias')
      .in('cluster_id', clusters.map(c => c.id));

    const { data: existingLinks } = await supabase
      .from('canonical_cluster_links')
      .select('from_cluster_id, to_cluster_id, link_type')
      .in('from_cluster_id', clusters.map(c => c.id));

    // Build indices
    const clustersByType = {};
    const clusterById = {};
    const clusterByNormName = {};
    const membersByCluster = {};
    const aliasesByCluster = {};

    for (const c of clusters) {
      if (!clustersByType[c.cluster_type]) clustersByType[c.cluster_type] = [];
      clustersByType[c.cluster_type].push(c);
      clusterById[c.id] = c;
      clusterByNormName[normalizeEntityName(c.canonical_name)] = c;
    }

    for (const m of members) {
      if (!membersByCluster[m.cluster_id]) membersByCluster[m.cluster_id] = [];
      membersByCluster[m.cluster_id].push(m);
    }

    for (const a of aliases) {
      if (!aliasesByCluster[a.cluster_id]) aliasesByCluster[a.cluster_id] = [];
      aliasesByCluster[a.cluster_id].push(a.alias);
    }

    // Track existing links to avoid duplicates
    const existingLinkSet = new Set();
    for (const link of existingLinks) {
      existingLinkSet.add(`${link.from_cluster_id}|${link.to_cluster_id}|${link.link_type}`);
    }

    console.log(`[expand-canonical-links] Already have ${existingLinkSet.size} existing links`);

    // ========================================================================
    // GENERATE EXPANDED LINKS
    // ========================================================================

    const newLinks = new Set();
    const systemClusters = clustersByType['system'] || [];
    const partClusters = clustersByType['part'] || [];
    const maintenanceClusters = clustersByType['maintenance_target'] || [];
    const faultClusters = clustersByType['fault_target'] || [];

    // Rule 1: parts belong to systems (part_of relationship)
    for (const part of partClusters) {
      for (const system of systemClusters) {
        if (areNamesRelated(part.canonical_name, system.canonical_name)) {
          const key = `${part.id}|${system.id}|part_of`;
          if (!existingLinkSet.has(key)) {
            newLinks.add(key);
          }
        }
      }
    }
    console.log(`[expand-canonical-links] part_of relationships: ${newLinks.size}`);

    // Rule 2: parts are used in maintenance tasks (used_in relationship)
    for (const part of partClusters) {
      for (const maint of maintenanceClusters) {
        if (areNamesRelated(part.canonical_name, maint.canonical_name)) {
          const key = `${part.id}|${maint.id}|used_in`;
          if (!existingLinkSet.has(key)) {
            newLinks.add(key);
          }
        }
      }
    }
    console.log(`[expand-canonical-links] used_in relationships: ${newLinks.size}`);

    // Rule 3: faults are related to systems they affect (affects relationship)
    for (const fault of faultClusters) {
      for (const system of systemClusters) {
        if (areNamesRelated(fault.canonical_name, system.canonical_name)) {
          const key = `${fault.id}|${system.id}|affects`;
          if (!existingLinkSet.has(key)) {
            newLinks.add(key);
          }
        }
      }
    }
    console.log(`[expand-canonical-links] affects relationships: ${newLinks.size}`);

    // Rule 4: cross-type fuzzy matching (maintenance and fault disambiguation)
    for (const maint of maintenanceClusters) {
      for (const fault of faultClusters) {
        if (
          areNamesSimilar(maint.canonical_name, fault.canonical_name, 3) ||
          areNamesRelated(maint.canonical_name, fault.canonical_name)
        ) {
          const key = `${fault.id}|${maint.id}|referenced_in`;
          if (!existingLinkSet.has(key)) {
            newLinks.add(key);
          }
        }
      }
    }
    console.log(`[expand-canonical-links] referenced_in relationships: ${newLinks.size}`);

    // Rule 5: system hierarchy (subsystems)
    for (const sys1 of systemClusters) {
      for (const sys2 of systemClusters) {
        if (sys1.id !== sys2.id && normalizeEntityName(sys1.canonical_name).includes(normalizeEntityName(sys2.canonical_name))) {
          const key = `${sys2.id}|${sys1.id}|contains`;
          if (!existingLinkSet.has(key)) {
            newLinks.add(key);
          }
        }
      }
    }
    console.log(`[expand-canonical-links] contains relationships: ${newLinks.size}`);

    // Convert to array and write
    const linkArray = Array.from(newLinks).map(key => {
      const [fromId, toId, linkType] = key.split('|');
      return {
        from_cluster_id: fromId,
        to_cluster_id: toId,
        link_type: linkType,
        confidence: 'medium',
      };
    });

    console.log(`\n[expand-canonical-links] Writing ${linkArray.length} new links...`);

    let linksWritten = 0;
    const batchSize = 50;

    for (let i = 0; i < linkArray.length; i += batchSize) {
      const batch = linkArray.slice(i, Math.min(i + batchSize, linkArray.length));
      const { error } = await supabase.from('canonical_cluster_links').insert(batch);

      if (error) {
        if (error.code !== '23505' && !error.message.includes('UNIQUE')) {
          console.error(`[expand-canonical-links] Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
        }
      } else {
        linksWritten += batch.length;
      }
    }

    console.log(`[expand-canonical-links] Wrote ${linksWritten} new links`);

    // ========================================================================
    // FINAL REPORT
    // ========================================================================

    const { data: allLinksNow } = await supabase
      .from('canonical_cluster_links')
      .select('link_type')
      .in('from_cluster_id', clusters.map(c => c.id));

    const linksByType = {};
    for (const link of allLinksNow) {
      linksByType[link.link_type] = (linksByType[link.link_type] || 0) + 1;
    }

    console.log('\n' + '='.repeat(80));
    console.log('[CANONICAL LINKS EXPANSION - COMPLETE]');
    console.log('='.repeat(80));
    console.log(`Total links now: ${allLinksNow.length}`);
    console.log('Links by type:');
    for (const [type, count] of Object.entries(linksByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    console.log(`Average links per cluster: ${(allLinksNow.length / clusters.length).toFixed(2)}`);
    console.log('='.repeat(80));

  } catch (err) {
    console.error('[expand-canonical-links] FATAL ERROR:', err.message);
    process.exit(1);
  }
}

main();
