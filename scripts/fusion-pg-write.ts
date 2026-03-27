import { createClient } from "@supabase/supabase-js";
import { fuseEntities } from "../src/lib/machines/intelligence/fusion/EntityFusionService";
import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";
import { randomUUID } from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const VB750 = "30000000-0000-0000-0000-111111111111";
const PG_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

async function main() {
  console.log("=== VB750 CANONICAL FUSION (direct pg) ===\n");

  // 1. Load source entities via supabase-js (reads are fine)
  const { data: ents } = await sb.from("machine_kb_entities").select("*").eq("machine_id", VB750);
  const { data: evid } = await sb.from("machine_kb_evidence").select("*").eq("machine_id", VB750);
  if (!ents) throw new Error("No entities");
  console.log(`1) Source: ${ents.length} entities, ${evid?.length || 0} evidence`);

  // 2. Run fusion
  const clusters = fuseEntities(ents as any, (evid || []) as any);
  console.log(`2) Fused: ${clusters.length} clusters`);

  // 3. Direct PG connection
  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();
  console.log("3) Connected to PostgreSQL directly");

  try {
    await pg.query("BEGIN");

    // Clean canonical tables for VB750
    await pg.query("DELETE FROM canonical_cluster_members WHERE cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id = $1)", [VB750]);
    await pg.query("DELETE FROM canonical_cluster_aliases WHERE cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id = $1)", [VB750]);
    await pg.query("DELETE FROM canonical_cluster_links WHERE from_cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id = $1)", [VB750]);
    await pg.query("DELETE FROM canonical_clusters WHERE machine_id = $1", [VB750]);
    await pg.query("DELETE FROM canonical_fusion_runs WHERE machine_id = $1", [VB750]);
    console.log("4) Cleaned canonical tables");

    // Insert clusters
    const clusterIdMap = new Map<string, string>(); // cluster_id -> db_uuid
    let clustersWritten = 0;
    
    for (const c of clusters) {
      const dbId = randomUUID();
      clusterIdMap.set(c.cluster_id, dbId);

      // Map cluster_type to allowed values
      let clusterType = c.cluster_type;
      if (!['system', 'component', 'part', 'maintenance_target', 'fault_target'].includes(clusterType)) {
        clusterType = 'component';
      }
      
      // Map confidence
      let conf = c.confidence;
      if (!['LOW', 'MEDIUM', 'HIGH'].includes(conf?.toUpperCase())) conf = 'MEDIUM';

      await pg.query(
        `INSERT INTO canonical_clusters (id, machine_id, canonical_name, cluster_type, confidence, source_doc_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [dbId, VB750, c.canonical_name, clusterType, conf.toUpperCase(), c.source_docs.length, JSON.stringify({ source_entity_count: c.source_entity_ids.length })]
      );
      clustersWritten++;
    }
    console.log(`5) Inserted ${clustersWritten} clusters`);

    // Insert aliases
    let aliasCount = 0;
    for (const c of clusters) {
      const dbId = clusterIdMap.get(c.cluster_id);
      if (!dbId) continue;
      for (const alias of (c.aliases || [])) {
        if (alias && alias !== c.canonical_name) {
          await pg.query(
            `INSERT INTO canonical_cluster_aliases (id, cluster_id, alias) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [randomUUID(), dbId, alias]
          );
          aliasCount++;
        }
      }
    }
    console.log(`6) Inserted ${aliasCount} aliases`);

    // Insert members
    let memberCount = 0;
    const validEntityTypes = ['part', 'procedure', 'maintenance_task', 'fault_case', 'system'];
    for (const c of clusters) {
      const dbId = clusterIdMap.get(c.cluster_id);
      if (!dbId) continue;
      for (let i = 0; i < c.source_entity_ids.length; i++) {
        const entityId = c.source_entity_ids[i];
        const entityType = c.source_entity_types[i] || 'part';
        const safeType = validEntityTypes.includes(entityType) ? entityType : 'part';
        await pg.query(
          `INSERT INTO canonical_cluster_members (id, cluster_id, source_entity_id, source_entity_type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [randomUUID(), dbId, entityId, safeType]
        );
        memberCount++;
      }
    }
    console.log(`7) Inserted ${memberCount} members`);

    // Insert fusion run
    const runId = randomUUID();
    await pg.query(
      `INSERT INTO canonical_fusion_runs (id, machine_id, source_docs_count, source_entities_count, canonical_clusters_count, status)
       VALUES ($1, $2, $3, $4, $5, 'completed')`,
      [runId, VB750, 5, ents.length, clusters.length]
    );
    console.log(`8) Inserted fusion run: ${runId}`);

    await pg.query("COMMIT");
    console.log("9) Committed\n");

    // Verify
    const [cl, mb, al, ln, rn] = await Promise.all([
      pg.query("SELECT COUNT(*) FROM canonical_clusters WHERE machine_id=$1", [VB750]),
      pg.query("SELECT COUNT(*) FROM canonical_cluster_members WHERE cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id=$1)", [VB750]),
      pg.query("SELECT COUNT(*) FROM canonical_cluster_aliases WHERE cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id=$1)", [VB750]),
      pg.query("SELECT COUNT(*) FROM canonical_cluster_links WHERE from_cluster_id IN (SELECT id FROM canonical_clusters WHERE machine_id=$1)", [VB750]),
      pg.query("SELECT COUNT(*) FROM canonical_fusion_runs WHERE machine_id=$1", [VB750]),
    ]);

    console.log("10) Verification:");
    console.log(`  clusters: ${cl.rows[0].count}`);
    console.log(`  members: ${mb.rows[0].count}`);
    console.log(`  aliases: ${al.rows[0].count}`);
    console.log(`  links: ${ln.rows[0].count}`);
    console.log(`  runs: ${rn.rows[0].count}`);

    // First 5 clusters
    const top5 = await pg.query(
      `SELECT cc.id, cc.canonical_name, cc.cluster_type, cc.confidence, COUNT(ccm.id) as member_count
       FROM canonical_clusters cc
       LEFT JOIN canonical_cluster_members ccm ON ccm.cluster_id = cc.id
       WHERE cc.machine_id = $1
       GROUP BY cc.id, cc.canonical_name, cc.cluster_type, cc.confidence
       ORDER BY member_count DESC, cc.canonical_name
       LIMIT 5`, [VB750]
    );

    console.log("\n11) Top 5 clusters:");
    for (const row of top5.rows) {
      console.log(`  [${row.cluster_type}] ${row.canonical_name} (${row.confidence}, ${row.member_count} members)`);
    }

    const coherent = parseInt(mb.rows[0].count) === ents.length ? "PASS" : `FAIL (${mb.rows[0].count}/${ents.length})`;
    console.log(`\n12) Coherence: ${coherent}`);

  } catch (err) {
    await pg.query("ROLLBACK");
    throw err;
  } finally {
    await pg.end();
  }

  console.log("\n✅ DONE");
  process.exit(0);
}

main().catch(e => { console.error("BLOCKED:", (e as Error).message); process.exit(1); });
