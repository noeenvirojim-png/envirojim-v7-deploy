import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";
import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import fs from "fs";
import path from "path";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const service = new MachineIngestionService(apiKey);
  
  const organizationId = "30000000-0000-0000-0000-000000000000"; 
  const machineId = "30000000-0000-0000-0000-111111111111"; 
  const userId = "21206e89-612e-4d7e-8d23-52a976fbe271"; 

  // 0. Force Reset (for re-run robustness)
  console.log("Resetting document states for VB750...");
  await supabase.from("machine_documents").update({ processing_status: "uploaded" }).eq("machine_id", machineId);

  // 1. Setup Context
  console.log("Setting up VB750 context...");
  const { error: orgErr } = await supabase.from("organizations").upsert({ id: organizationId, name: "VB750 REAL TEST" });
  if (orgErr) { console.error("Org Upsert Failed:", orgErr.message); process.exit(1); }

  const { error: machErr } = await supabase.from("machines").upsert({ 
    id: machineId, 
    organization_id: organizationId, 
    model: "VB750 DK -1208",
    serial_number: "VB750-1208-REAL-001"
  });
  if (machErr) { console.error("Machine Upsert Failed:", machErr.message); return; }

  const pdfFolder = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';
  const pdfs = fs.readdirSync(pdfFolder).filter(f => f.toLowerCase().endsWith('.pdf'));

  console.log(`Found ${pdfs.length} PDFs. Starting ingestion...`);

  // 2. Ingest PDFs
  for (const pdf of pdfs) {
    const filePath = path.join(pdfFolder, pdf);
    const sanitizedPdfName = pdf.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `real-test/vb750/${sanitizedPdfName}`;

    // Check if doc already exists in DB
    const { data: existingDoc } = await supabase
      .from("machine_documents")
      .select("id")
      .eq("machine_id", machineId)
      .eq("filename", pdf)
      .maybeSingle();

    if (existingDoc) {
      console.log(`Already Ingested: ${pdf}`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath);

    // Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from("machine-documents")
      .upload(storagePath, fileContent, { 
        upsert: true,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      console.error(`Upload failed for ${pdf}:`, uploadError.message);
      continue;
    }

    // Insert Document Record
    const { error: dbError } = await supabase.from("machine_documents").insert({
      organization_id: organizationId,
      machine_id: machineId,
      filename: pdf,
      storage_path: storagePath,
      processing_status: "uploaded",
      document_type: "manual",
      language: "fr"
    });

    if (dbError) {
      console.error(`DB Insert failed for ${pdf}:`, dbError.message);
    } else {
      console.log(`Ingested: ${pdf} -> ${storagePath}`);
    }
  }

  // 3. Start Run
  console.log("Starting full pipeline run...");
  const runId = await service.startRun(machineId, organizationId, userId);
  console.log(`Run started: ${runId}`);

  try {
    console.log("Phase: INVENTORY...");
    await service.runInventory(runId);
    console.log("Phase: EXTRACT...");
    await service.runAllDocumentExtracts(runId);
    console.log("Phase: CONSOLIDATE...");
    await service.runConsolidation(runId);
    console.log("PIPELINE_COMPLETE");
  } catch (err: any) {
    console.error("PIPELINE_ERROR:", err.message);
  }

  // 4. Output Summary for DB Extraction
  console.log(`FINAL_RUN_ID: ${runId}`);
}

run();
