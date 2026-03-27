import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  
  console.log("--- DIAGNOSTIC START ---");
  
  const { data: docs } = await s.from("machine_documents").select("*");
  console.log("MACHINE_DOCUMENTS:", JSON.stringify(docs, null, 2));
  
  const { data: inv } = await s.from("machine_document_inventory").select("*");
  console.log("DOCUMENT_INVENTORY:", JSON.stringify(inv, null, 2));
  
  const { data: runs } = await s.from("machine_ingestion_runs").select("*");
  console.log("INGESTION_RUNS:", JSON.stringify(runs, null, 2));
  
  const { data: steps } = await s.from("machine_ingestion_steps").select("*").order("step_order", { ascending: true });
  console.log("INGESTION_STEPS:", JSON.stringify(steps, null, 2));
  
  console.log("--- DIAGNOSTIC END ---");
}

run();
