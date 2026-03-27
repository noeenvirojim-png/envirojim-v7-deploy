import { createAdminClient } from "../src/lib/supabase/admin";
import fs from "fs";
import path from "path";

async function seed() {
  const supabase = createAdminClient();
  const pdfPath = path.resolve(__dirname, "valid-test.pdf");
  const pdfBuffer = fs.readFileSync(pdfPath);

  // 1. Ensure Org / Machine
  const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
  const orgId = org?.id;
  
  const { data: machine } = await supabase.from("machines").select("id").limit(1).single();
  const machineId = machine?.id;

  if (!orgId || !machineId) {
    throw new Error("No org or machine found. Run test-e2e-single-document.ts first.");
  }

  // 2. Upload to storage
  const storagePath = "e2e/test-seed.pdf";
  const { error: storageErr } = await supabase.storage
    .from("machine-documents")
    .upload(storagePath, pdfBuffer, { upsert: true, contentType: "application/pdf" });
  
  if (storageErr) throw storageErr;
  console.log(`Uploaded ${pdfPath} to ${storagePath}`);

  // 3. Create machine_documents record
  const { data: doc, error: docErr } = await supabase
    .from("machine_documents")
    .insert({
      machine_id: machineId,
      organization_id: orgId,
      filename: "test-seed.pdf",
      storage_path: storagePath,
      processing_status: "uploaded",
      document_type: "manual",
      language: "en"
    })
    .select("id")
    .single();
  
  if (docErr) throw docErr;
  console.log(`Created document record: ${doc.id}`);
}

seed().catch(console.error);
