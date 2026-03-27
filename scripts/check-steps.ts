import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const supabase = createAdminClient();
  const { data: run } = await supabase
    .from("machine_ingestion_runs")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!run) {
    console.log("No run found.");
    return;
  }

  console.log("Target Run ID:", run.id);
  const { data: steps, error } = await supabase
    .from("machine_ingestion_steps")
    .select("*")
    .eq("run_id", run.id)
    .order("step_order", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  console.log("PROOFS_STEPS_AUDIT", JSON.stringify(steps, null, 2));
}

run();
