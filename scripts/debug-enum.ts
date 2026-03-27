import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const supabase = createAdminClient();
  
  // Find a real doc
  const { data: doc } = await supabase.from("machine_documents").select("id").limit(1).single();
  if (!doc) {
    console.log("No documents found.");
    return;
  }

  console.log("Found Document:", doc.id);
  
  const { error } = await supabase
    .from("machine_documents")
    .update({ processing_status: "JUNK_VALUE" as any })
    .eq("id", doc.id);

  console.log("ENUM_ERROR_OUTPUT:", error?.message);
}

run();
