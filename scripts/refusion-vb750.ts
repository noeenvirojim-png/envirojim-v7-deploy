import { createClient } from "@supabase/supabase-js";
import { fuseEntities } from "../src/lib/machines/intelligence/fusion/EntityFusionService";
import { writeFusionToCanonicalGraph } from "../src/lib/machines/intelligence/fusion/CanonicalGraphWriter";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const VB750 = "30000000-0000-0000-0000-111111111111";

async function refusion() {
  console.log("=== REFUSION START ===\n");

  // Clean canonical
  console.log("1) Cleaning...");
  await Promise.all([
    sb.from("canonical_cluster_members").delete().eq("machine_id", VB750),
    sb.from("canonical_cluster_aliases").delete().eq("machine_id", VB750),
    sb.from("canonical_cluster_links").delete().eq("machine_id", VB750),
    sb.from("canonical_clusters").delete().eq("machine_id", VB750),
    sb.from("canonical_fusion_runs").delete().eq("machine_id", VB750),
  ]);
  console.log("✓\n");

  // Load entities
  console.log("2) Loading entities...");
  const { data: entities } = await sb
    .from("machine_kb_entities")
    .select("*")
    .eq("machine_id", VB750);

  if (!entities || entities.length === 0) throw new Error("No entities");
  console.log(`✓ ${entities.length} entities\n`);

  // Normalize
  const normalized = entities.map((e: any) => ({
    id: e.id,
    type: e.entity_type,
    name: e.canonical_name,
    originalLabel: e.original_label,
    confidence: e.confidence,
    language: e.language,
  }));

  // Fuse
  console.log("3) Fusing...");
  const clusters = fuseEntities(normalized);
  console.log(`✓ ${clusters.length} clusters\n`);

  // Write
  console.log("4) Writing...");
  const runId = await writeFusionToCanonicalGraph(sb, VB750, clusters, entities.length, 5);
  console.log(`✓ Run: ${runId}\n`);

  // Verify
  console.log("5) Verifying...");
  const [
    { data: clustersData },
    { data: membersData },
    { data: aliasesData },
    { data: linksData },
    { data: runsData },
  ] = await Promise.all([
    sb.from("canonical_clusters").select("*").eq("machine_id", VB750),
    sb.from("canonical_cluster_members").select("*").eq("machine_id", VB750),
    sb.from("canonical_cluster_aliases").select("*").eq("machine_id", VB750),
    sb.from("canonical_cluster_links").select("*").eq("machine_id", VB750),
    sb.from("canonical_fusion_runs").select("*").eq("machine_id", VB750),
  ]);

  console.log(`Clusters: ${clustersData?.length || 0}`);
  console.log(`Members: ${membersData?.length || 0}`);
  console.log(`Aliases: ${aliasesData?.length || 0}`);
  console.log(`Links: ${linksData?.length || 0}`);
  console.log(`Runs: ${runsData?.length || 0}\n`);

  // Display first 5
  console.log("6) First 5 clusters:");
  const first5 = (clustersData || []).slice(0, 5);
  for (const c of first5) {
    const mems = membersData?.filter((m: any) => m.cluster_id === c.id) || [];
    const als = aliasesData?.filter((a: any) => a.cluster_id === c.id) || [];
    console.log(`  [${c.cluster_type}] ${c.canonical_name} (conf:${c.confidence}, members:${mems.length}, aliases:${als.length})`);
  }

  // Coherence
  console.log("\n7) Coherence:");
  const totalMembers = membersData?.length || 0;
  const coherent = totalMembers === entities.length ? "PASS" : `FAIL (${totalMembers}/${entities.length})`;
  console.log(`  Members vs Source: ${coherent}`);

  console.log("\n✅ DONE");
  process.exit(0);
}

refusion().catch((e) => {
  console.error("BLOCKED:", (e as Error).message.substring(0, 150));
  process.exit(1);
});
