import { createAdminClient } from "../src/lib/supabase/admin";

async function run() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("machine_documents")
    .select("id, filename, storage_path, machine_id, organization_id")
    .limit(10);
  
  if (error) {
    console.error("Error fetching docs:", error);
    return;
  }

  console.log("Documents found:", data?.length || 0);
  for (const doc of data || []) {
    console.log(`- ID: ${doc.id}, File: ${doc.filename}, Path: ${doc.storage_path}`);
    
    // Check if it exists in storage
    const bucket = "machine-documents"; // Common bucket name
    const { data: file, error: fileErr } = await supabase.storage.from(bucket).download(doc.storage_path);
    if (fileErr) {
      console.log(`  Storage Error: ${fileErr.message}`);
    } else {
      console.log(`  Storage OK: ${file.size} bytes`);
    }
  }
}

run();
