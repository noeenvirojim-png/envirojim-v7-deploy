import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const supabase = createAdminClient();
  
  // Try to find a document to confirm table exists
  const { data: docs, error: docError } = await supabase.from("machine_documents").select("*").limit(1);
  
  if (docError) {
      console.log("TABLE_ERROR:", docError.message || docError);
      return;
  }

  if (docs && docs.length > 0) {
      console.log("COLUMNS:", Object.keys(docs[0]));
      console.log("SAMPLE_STATUS:", docs[0].processing_status);
  } else {
      console.log("NO_DOCUMENTS_FOUND (Table exists)");
  }

  // Find enum values via SQL error (Try to insert a row with junk status)
  const { error: enumError } = await supabase
    .from("machine_documents")
    .insert({
        machine_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        organization_id: "00000000-0000-0000-0000-000000000000",
        filename: "test.pdf",
        storage_path: "test/test.pdf",
        document_type: "manual",
        processing_status: "JUNK_STATUS" as any
    });

  if (enumError) {
      console.log("ENUM_RAW_ERROR:", enumError.message);
  }
}

run();
