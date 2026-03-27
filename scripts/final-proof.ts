import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const runId = "6a147a56-a726-4380-94b2-2a8e7538cc5f";
  
  const { data } = await s
    .from("machine_ingestion_steps")
    .select("id, step_name, phase, status, step_order")
    .eq("run_id", runId)
    .order("step_order", { ascending: true });
    
  console.log(JSON.stringify(data, null, 2));
}

run();
