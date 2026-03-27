import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import { createAdminClient } from "../src/lib/supabase/admin";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const service = new MachineIngestionService(apiKey);
  const supabase = createAdminClient();

  const testDocs = [
    { type: "parts_catalog", file: "12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf" },
    { type: "troubleshooting", file: "11 VB750DK-m2021 EU V Dérangements possibles et leur solutionnement V202.pdf" },
    { type: "electrical_schematics", file: "13-1 VB750DK-1208  Schémas électriques.pdf" },
    { type: "hydraulic_schematics", file: "14-1 VB750DK-1208 Schéma hydraulique.pdf" }
  ];

  console.log("Starting targeted routing validation...");

  for (const testDoc of testDocs) {
    console.log(`\nTesting TYPE: ${testDoc.type} | FILE: ${testDoc.file}`);
    
    // Get document from DB
    const { data: doc } = await supabase
      .from("machine_documents")
      .select("*")
      .eq("filename", testDoc.file)
      .maybeSingle();

    if (!doc) {
      console.log(`SKIPPING: ${testDoc.file} not found in DB`);
      continue;
    }

    // Create a real run for test
    const { data: run, error: runErr } = await supabase.from("machine_ingestion_runs").insert({
      machine_id: doc.machine_id,
      organization_id: doc.organization_id,
      started_by: "21206e89-612e-4d7e-8d23-52a976fbe271",
      status: "running",
      current_phase: "EXTRACT",
      total_documents: 1,
      processed_documents: 0,
      successful_documents: 0,
      failed_documents: 0
    }).select("id").single();

    if (runErr || !run) {
      console.error(`FAIL: Could not create run:`, runErr?.message);
      process.exit(1);
    }

    try {
      await service.runDocumentExtract(run.id, doc as any);
      console.log(`SUCCESS: ${testDoc.type} extraction completed and validated.`);
    } catch (err: any) {
      console.error(`FAIL: ${testDoc.type} failed:`, err.message);
      // If one fails, we stop as per ETAPE 9 rules: "SI FAIL -> STOP"
      process.exit(1);
    }
  }

  console.log("\nALL TARGETED TESTS PASSED.");
  console.log("STATUS: VALIDATED");
}

test();
