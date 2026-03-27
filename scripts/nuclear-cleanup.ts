import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  const tables = [
      "machine_ingestion_steps", 
      "machine_ingestion_runs", 
      "machine_document_inventory", 
      "machine_document_extracts", 
      "machine_kb_evidence", 
      "machine_kb_entities", 
      "machine_kb_contradictions",
      "machine_kb_ambiguities",
      "machine_kb_cross_links",
      "machine_kb", 
      "machine_documents", 
      "machines", 
      "users", 
      "organizations"
  ];
  
  console.log("Starting nuclear cleanup...");
  
  for (const t of tables) {
    try {
        const { error } = await s.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) console.log(`Error cleaning ${t}:`, error.message);
        else console.log(`Cleaned ${t}`);
    } catch (e) {
        console.log(`Failed to clean ${t}`);
    }
  }
  
  console.log("CLEANUP_COMPLETE");
}

run();
