import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function audit() {
  const supabase = createAdminClient();

  console.log("--- DB COUNTS (machine_documents) ---");
  const { data: counts, error: countErr } = await supabase
    .from("machine_documents")
    .select("processing_status");
  
  if (countErr) {
    console.log("Error fetching counts:", countErr.message);
  } else {
    const statusMap = counts.reduce((acc: any, doc: any) => {
      acc[doc.processing_status] = (acc[doc.processing_status] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify(statusMap, null, 2));
  }

  console.log("\n--- LAST INGESTION RUNS ---");
  const { data: runs, error: runsErr } = await supabase
    .from("machine_ingestion_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(3);
  
  if (runsErr) {
    console.log("Error fetching runs:", runsErr.message);
  } else {
    console.log(JSON.stringify(runs, null, 2));
  }

  if (runs && runs.length > 0) {
    const lastRunId = runs[0].id;
    console.log(`\n--- STEPS FOR LAST RUN (${lastRunId}) ---`);
    const { data: steps, error: stepsErr } = await supabase
      .from("machine_ingestion_steps")
      .select("*")
      .eq("run_id", lastRunId)
      .order("step_order", { ascending: true });
    
    if (stepsErr) {
      console.log("Error fetching steps:", stepsErr.message);
    } else {
      console.log(JSON.stringify(steps, null, 2));
    }
  }
}

audit();
