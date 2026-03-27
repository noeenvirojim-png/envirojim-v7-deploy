import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const s = createAdminClient();
  
  console.log("Checking current machine_documents state...");
  const { data: docs } = await s.from("machine_documents").select("id, filename, machine_id, processing_status, organization_id");
  console.log("DOCS_BEFORE:", JSON.stringify(docs, null, 2));

  if (docs && docs.length > 0) {
    const targetDoc = docs.find(d => d.filename === "test-seed.pdf") || docs[0];
    console.log(`Forcing document ${targetDoc.id} to uploaded...`);
    
    // Ensure all documents for this machine are marked as failed EXCEPT our target
    await s.from("machine_documents").update({ processing_status: "failed" }).eq("machine_id", targetDoc.machine_id);
    
    const { data: updated, error } = await s.from("machine_documents")
      .update({ processing_status: "uploaded" })
      .eq("id", targetDoc.id)
      .select("id, processing_status")
      .single();
      
    if (error) console.error("Error updating doc:", error.message);
    else console.log("DOC_AFTER_FIX:", JSON.stringify(updated, null, 2));
  } else {
    console.log("ERROR: No documents found to fix.");
  }
}

run();
