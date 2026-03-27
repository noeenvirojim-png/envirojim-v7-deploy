import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const runId = "6a147a56-a726-4380-94b2-2a8e7538cc5f"; // Successful RunID from Step 3059
  
  console.log("--- FINAL RAW DB PROOF ---");
  
  const tables = [
    "machine_documents",
    "machine_ingestion_runs",
    "machine_ingestion_steps",
    "machine_document_inventory",
    "machine_document_extracts",
    "machine_kb",
    "machine_kb_entities",
    "machine_kb_evidence"
  ];
  
  for (const t of tables) {
    console.log(`\nTABLE: ${t}`);
    let query = s.from(t).select("*");
    
    // Filter by runId where applicable to show relevant data
    if (t === "machine_ingestion_runs") query = query.eq("id", runId);
    if (["machine_ingestion_steps", "machine_document_inventory", "machine_document_extracts", "machine_kb_entities"].includes(t)) query = query.eq("run_id", runId);
    
    const { data } = await query;
    console.log(JSON.stringify(data || [], null, 2));
  }
}

run();
