import { createClient } from "@supabase/supabase-js";
import { fuseEntities } from "../src/lib/machines/intelligence/fusion/EntityFusionService";
import { writeCanonicalClusters } from "../src/lib/machines/intelligence/fusion/CanonicalGraphWriter";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const VB750 = "30000000-0000-0000-0000-111111111111";
const ORG = "30000000-0000-0000-0000-000000000000";

async function go() {
  const { data: ents } = await sb.from("machine_kb_entities").select("*").eq("machine_id", VB750);
  const { data: evid } = await sb.from("machine_kb_evidence").select("*").eq("machine_id", VB750);

  const clusters = fuseEntities(ents as any, evid as any);
  console.log(`Fused: ${clusters.length} clusters`);

  try {
    const result = await writeCanonicalClusters(sb, VB750, ORG, clusters);
    console.log(`Result:`, result);
  } catch (err) {
    console.error(`ERROR:`, (err as Error).message);
  }

  process.exit(0);
}

go();
