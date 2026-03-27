import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  
  console.log("--- TABLE: machine_documents ---");
  const { data: docs } = await s.from("machine_documents").select("id, filename, machine_id, processing_status, organization_id");
  console.log(JSON.stringify(docs, null, 2));

  console.log("\n--- TABLE: machine_ingestion_runs ---");
  const { data: runs } = await s.from("machine_ingestion_runs").select("*").order("created_at", { ascending: false }).limit(1);
  console.log(JSON.stringify(runs, null, 2));

  if (runs && runs.length > 0) {
    console.log(`\n--- TABLE: machine_ingestion_steps (Run: ${runs[0].id}) ---`);
    const { data: steps } = await s.from("machine_ingestion_steps").select("*").eq("run_id", runs[0].id).order("step_order", { ascending: true });
    console.log(JSON.stringify(steps, null, 2));
  }
}

run();
