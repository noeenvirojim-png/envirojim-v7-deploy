import { createClient } from "@supabase/supabase-js";
import { fuseEntities } from "../src/lib/machines/intelligence/fusion/EntityFusionService";
import { writeFusionToCanonicalGraph } from "../src/lib/machines/intelligence/fusion/CanonicalGraphWriter";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const VB750 = "30000000-0000-0000-0000-111111111111";
const ORG = "30000000-0000-0000-0000-000000000000";

async function go() {
  // Clean
  await Promise.all([
    sb.from("canonical_cluster_members").delete().eq("machine_id", VB750),
    sb.from("canonical_cluster_aliases").delete().eq("machine_id", VB750),
    sb.from("canonical_cluster_links").delete().eq("machine_id", VB750),
    sb.from("canonical_clusters").delete().eq("machine_id", VB750),
    sb.from("canonical_fusion_runs").delete().eq("machine_id", VB750),
  ]);
  console.log("1) Cleaned");

  // Load
  const { data: ents } = await sb
    .from("machine_kb_entities")
    .select("*")
    .eq("machine_id", VB750);

  const { data: evid } = await sb
    .from("machine_kb_evidence")
    .select("*")
    .eq("machine_id", VB750);

  if (!ents) throw new Error("No entities");
  console.log(`2) Loaded: ${ents.length} entities, ${evid?.length || 0} evidence`);

  // Fuse
  const clusters = fuseEntities(ents as any, evid as any);
  console.log(`3) Fused: ${clusters.length} clusters`);

  // Write
  const result = await writeFusionToCanonicalGraph(sb, VB750, ORG, clusters);
  console.log(`4) Written: run=${result.runId}, clusters=${result.clustersWritten}, members=${result.membersWritten}`);

  // Verify
  const [cl, mb, al, ln, rn] = await Promise.all([
    sb.from("canonical_clusters").select("*").eq("machine_id", VB750),
    sb.from("canonical_cluster_members").select("*").eq("machine_id", VB750),
    sb.from("canonical_cluster_aliases").select("*").eq("machine_id", VB750),
    sb.from("canonical_cluster_links").select("*").eq("machine_id", VB750),
    sb.from("canonical_fusion_runs").select("*").eq("machine_id", VB750),
  ]);

  console.log(`\n5) Verification:`);
  console.log(`  clusters: ${cl.data?.length || 0}`);
  console.log(`  members: ${mb.data?.length || 0}`);
  console.log(`  aliases: ${al.data?.length || 0}`);
  console.log(`  links: ${ln.data?.length || 0}`);
  console.log(`  runs: ${rn.data?.length || 0}`);

  console.log(`\n6) First 5 clusters:`);
  for (const c of (cl.data || []).slice(0, 5)) {
    const mems = (mb.data || []).filter(m => m.cluster_id === c.id);
    console.log(`  [${c.cluster_type}] ${c.canonical_name} (${c.confidence}, ${mems.length} members)`);
  }

  console.log(`\n7) Coherence: ${(mb.data?.length || 0) === ents.length ? "PASS" : "FAIL"}`);
  console.log("\n✅ DONE");
  process.exit(0);
}

go().catch(e => {
  console.error("BLOCKED:", (e as Error).message.substring(0, 150));
  process.exit(1);
});
