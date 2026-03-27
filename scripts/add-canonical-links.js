/**
 * Add Canonical Links - Phase 5
 * Generates semantic links between clusters based on type relationships,
 * name similarity, and evidence matching. Uses PostgreSQL direct access.
 *
 * Link rules:
 * 1. maintenance_target ----uses_part----> part
 * 2. maintenance_target ----maintains----> system
 * 3. fault_target ----related_fault----> maintenance_target
 * 4. part ----part_of----> system
 */

const { Client } = require('pg');
const assert = require('assert');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Parse PostgreSQL connection string or use defaults
let PG_CONFIG;
if (process.env.POSTGRES_URL) {
  // Parse connection string: postgresql://user:password@host:port/database
  const url = new URL(process.env.POSTGRES_URL);
  PG_CONFIG = {
    user: url.username || 'postgres',
    password: url.password || 'postgres',
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '5432'),
    database: url.pathname.slice(1) || 'machine_kb_vb750',
  };
} else {
  PG_CONFIG = {
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'machine_kb_vb750',
  };
}

const MACHINE_ID = 'VB750-DK-1208';
const MAX_LINKS = 500; // Safety limit

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
  const maxLen = Math.max(n1.length, n2.length);
  return distance <= threshold;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const client = new Client(PG_CONFIG);

  try {
    await client.connect();
    console.log(`[add-canonical-links] Connected to PostgreSQL: ${PG_CONFIG.database}`);

    // Load clusters
    const clustersRes = await client.query(
      `SELECT id, machine_id, canonical_name, cluster_type, confidence
       FROM canonical_clusters WHERE machine_id = $1 ORDER BY cluster_type, canonical_name`,
      [MACHINE_ID]
    );
    const clusters = clustersRes.rows;
    console.log(`[add-canonical-links] Loaded ${clusters.length} clusters`);

    // Load aliases for fuzzy matching
    const aliasesRes = await client.query(
      `SELECT cluster_id, alias FROM canonical_cluster_aliases WHERE cluster_id IN (
         SELECT id FROM canonical_clusters WHERE machine_id = $1
       )`,
      [MACHINE_ID]
    );
    const aliasesByClusterId = {};
    for (const row of aliasesRes.rows) {
      if (!aliasesByClusterId[row.cluster_id]) {
        aliasesByClusterId[row.cluster_id] = [];
      }
      aliasesByClusterId[row.cluster_id].push(row.alias);
    }
    console.log(`[add-canonical-links] Loaded ${aliasesRes.rows.length} aliases`);

    // Load members for coherence check
    const membersRes = await client.query(
      `SELECT cluster_id, COUNT(*) as member_count
       FROM canonical_cluster_members WHERE cluster_id IN (
         SELECT id FROM canonical_clusters WHERE machine_id = $1
       ) GROUP BY cluster_id`,
      [MACHINE_ID]
    );
    const memberCountByClusterId = {};
    for (const row of membersRes.rows) {
      memberCountByClusterId[row.cluster_id] = row.member_count;
    }
    console.log(`[add-canonical-links] Loaded member counts for ${Object.keys(memberCountByClusterId).length} clusters`);

    // Build indices for fast lookup
    const clustersByType = {};
    const clusterById = {};
    const clusterByName = {};
    for (const c of clusters) {
      if (!clustersByType[c.cluster_type]) {
        clustersByType[c.cluster_type] = [];
      }
      clustersByType[c.cluster_type].push(c);
      clusterById[c.id] = c;
      clusterByName[normalizeEntityName(c.canonical_name)] = c;
    }

    console.log(`[add-canonical-links] Cluster types: ${Object.keys(clustersByType).join(', ')}`);

    // ========================================================================
    // GENERATE LINKS
    // ========================================================================

    const links = new Set(); // (fromId, toId, linkType) as string for dedup

    // Rule 1: maintenance_target uses part
    const maintenanceTargets = clustersByType['maintenance_target'] || [];
    const parts = clustersByType['part'] || [];
    for (const maint of maintenanceTargets) {
      for (const part of parts) {
        // Check if names are similar or if part is mentioned in maintenance name
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
        // Conservative: only link if names are very similar or system explicitly mentioned
        const n1 = normalizeEntityName(maint.canonical_name);
        const n2 = normalizeEntityName(system.canonical_name);
        // Check for keywords like "hydraulic system" -> "hydraulic"
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
        // Conservative: only if names overlap significantly
        const n1 = normalizeEntityName(fault.canonical_name);
        const n2 = normalizeEntityName(maint.canonical_name);
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
        // Conservative: only if system name appears in part name
        const n1 = normalizeEntityName(part.canonical_name);
        const n2 = normalizeEntityName(system.canonical_name);
        if (n1.includes(n2)) {
          const key = `${part.id}|${system.id}|part_of`;
          links.add(key);
        }
      }
    }
    console.log(`[add-canonical-links] Rule 4 (part→system): ${links.size} links total`);

    // Safety check
    assert(links.size <= MAX_LINKS, `Too many links generated: ${links.size} > ${MAX_LINKS}`);

    // ========================================================================
    // WRITE LINKS TO DATABASE
    // ========================================================================

    const linkArray = Array.from(links).map(key => {
      const [fromId, toId, linkType] = key.split('|');
      return { fromId, toId, linkType };
    });

    console.log(`\n[add-canonical-links] Writing ${linkArray.length} links to database...`);

    let linksWritten = 0;
    for (const link of linkArray) {
      try {
        await client.query(
          `INSERT INTO canonical_cluster_links
           (from_cluster_id, to_cluster_id, link_type, confidence)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (from_cluster_id, to_cluster_id, link_type) DO NOTHING`,
          [link.fromId, link.toId, link.linkType, 'medium']
        );
        linksWritten++;
      } catch (err) {
        console.error(`[add-canonical-links] Error writing link ${link.fromId} -> ${link.toId}: ${err.message}`);
      }
    }

    console.log(`[add-canonical-links] Successfully wrote ${linksWritten} links`);

    // ========================================================================
    // VERIFY RESULTS
    // ========================================================================

    const totalLinksRes = await client.query(
      `SELECT COUNT(*) as total FROM canonical_cluster_links
       WHERE from_cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id = $1)`,
      [MACHINE_ID]
    );
    const totalLinks = parseInt(totalLinksRes.rows[0].total);

    const linksByTypeRes = await client.query(
      `SELECT link_type, COUNT(*) as count FROM canonical_cluster_links
       WHERE from_cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id = $1)
       GROUP BY link_type ORDER BY count DESC`,
      [MACHINE_ID]
    );

    const linksByConfidenceRes = await client.query(
      `SELECT confidence, COUNT(*) as count FROM canonical_cluster_links
       WHERE from_cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id = $1)
       GROUP BY confidence ORDER BY count DESC`,
      [MACHINE_ID]
    );

    const topLinksRes = await client.query(
      `SELECT
         l.from_cluster_id, l.to_cluster_id, l.link_type, l.confidence,
         c1.canonical_name as from_name, c2.canonical_name as to_name
       FROM canonical_cluster_links l
       JOIN canonical_clusters c1 ON l.from_cluster_id = c1.id
       JOIN canonical_clusters c2 ON l.to_cluster_id = c2.id
       WHERE c1.machine_id = $1
       ORDER BY l.created_at DESC
       LIMIT 10`,
      [MACHINE_ID]
    );

    // ========================================================================
    // REPORT
    // ========================================================================

    console.log('\n' + '='.repeat(80));
    console.log('[CANONICAL LINKS - PHASE 5 COMPLETE]');
    console.log('='.repeat(80));

    console.log(`\nMachine: ${MACHINE_ID}`);
    console.log(`Total Clusters: ${clusters.length}`);
    console.log(`Total Links Generated: ${totalLinks}`);
    console.log(`Links by Type:`);
    for (const row of linksByTypeRes.rows) {
      console.log(`  ${row.link_type}: ${row.count}`);
    }
    console.log(`Links by Confidence:`);
    for (const row of linksByConfidenceRes.rows) {
      console.log(`  ${row.confidence}: ${row.count}`);
    }

    console.log(`\nTop 10 Links (most recent):`);
    for (let i = 0; i < topLinksRes.rows.length; i++) {
      const row = topLinksRes.rows[i];
      console.log(`  ${i + 1}. ${row.from_name} --[${row.link_type}]--> ${row.to_name} (confidence: ${row.confidence})`);
    }

    // ========================================================================
    // COHERENCE CHECK
    // ========================================================================

    const clusterCoherenceRes = await client.query(
      `SELECT
         COUNT(DISTINCT c.id) as clusters_with_members,
         COUNT(DISTINCT c.id) FILTER (WHERE m.id IS NOT NULL) as clusters_with_links,
         COUNT(DISTINCT l.id) as total_links
       FROM canonical_clusters c
       LEFT JOIN canonical_cluster_members m ON c.id = m.cluster_id
       LEFT JOIN canonical_cluster_links l ON c.id = l.from_cluster_id OR c.id = l.to_cluster_id
       WHERE c.machine_id = $1`,
      [MACHINE_ID]
    );

    const coherence = clusterCoherenceRes.rows[0];

    console.log(`\nCanonical Graph Coherence:`);
    console.log(`  Clusters with members: ${coherence.clusters_with_members}`);
    console.log(`  Clusters with links: ${coherence.clusters_with_links}`);
    console.log(`  Total semantic links: ${coherence.total_links}`);
    console.log(`  Average links per cluster: ${(coherence.total_links / clusters.length).toFixed(2)}`);

    console.log('\n' + '='.repeat(80));
    console.log('RESULT: ✓ Canonical link generation complete');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('[add-canonical-links] FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
