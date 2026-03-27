import { createClient } from "@supabase/supabase-js";
import { fuseEntities } from "./src/lib/machines/intelligence/fusion/EntityFusionService";
import { writeFusionToCanonicalGraph } from "./src/lib/machines/intelligence/fusion/CanonicalGraphWriter";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TITAN_ID = "f6e9adf4-7852-42c7-ba1d-6bcaf587e0e8";

async function refusion() {
  console.log("=== TITAN 500 REFUSION ===\n");

  // Clean existing
  console.log("1) Cleaning...");
  await Promise.all([
    sb.from("canonical_cluster_members").delete().eq("machine_id", TITAN_ID),
    sb.from("canonical_cluster_aliases").delete().eq("machine_id", TITAN_ID),
    sb.from("canonical_cluster_links").delete().eq("machine_id", TITAN_ID),
    sb.from("canonical_clusters").delete().eq("machine_id", TITAN_ID),
  ]);
  console.log("✓\n");

  // Load entities
  console.log("2) Loading entities...");
  const { data: entities } = await sb
    .from("machine_kb_entities")
    .select("*")
    .eq("machine_id", TITAN_ID);

  if (!entities || entities.length === 0) throw new Error("No entities");
  console.log(`✓ ${entities.length} entities\n`);

  // Fuse
  console.log("3) Fusing...");
  const clusters = fuseEntities(entities as any);
  console.log(`✓ ${clusters.length} clusters\n`);
  
  // Show distribution
  const typeCounts: Record<string, number> = {};
  clusters.forEach(c => {
    typeCounts[c.cluster_type] = (typeCounts[c.cluster_type] || 0) + 1;
  });
  console.log("Cluster type distribution:");
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();

  // Write
  console.log("4) Writing...");
  const runId = await writeFusionToCanonicalGraph(sb, TITAN_ID, clusters, entities.length, 5);
  console.log(`✓ Run: ${runId}\n`);

  process.exit(0);
}

refusion().catch((e) => {
  console.error("BLOCKED:", (e as Error).message.substring(0, 150));
  process.exit(1);
});
