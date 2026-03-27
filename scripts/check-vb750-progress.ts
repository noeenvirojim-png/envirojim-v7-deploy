import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const runId = "6f19384d-2362-4756-9388-03130a54d17e";
  
  const { data: steps } = await s
    .from("machine_ingestion_steps")
    .select("step_name, phase, status, error_message, updated_at")
    .eq("run_id", runId)
    .order("step_order", { ascending: true });
    
  console.log("PROGRESS:");
  console.log(JSON.stringify(steps, null, 2));
  
  const { data: run } = await s
    .from("machine_ingestion_runs")
    .select("status, current_phase, processed_documents, total_documents, updated_at")
    .eq("id", runId)
    .single();
    
  console.log("RUN_STATUS:");
  console.log(JSON.stringify(run, null, 2));
}

run();
