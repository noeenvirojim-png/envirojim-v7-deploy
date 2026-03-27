import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const VB750_ID = "30000000-0000-0000-0000-111111111111";
const ORG_ID = "30000000-0000-0000-0000-000000000000";
const SYSTEM_USER_ID = "21206e89-612e-4d7e-8d23-52a976fbe271"; // Arbitrary system user UUID

async function repairVB750() {
  try {
    console.log("=== VB750 REPAIR - DIRECT EXECUTION ===\n");

    const service = new MachineIngestionService(geminiApiKey);

    // Create a manual run
    console.log("📝 Step 1: Creating manual ingestion run...");
    const { data: run, error: runError } = await supabase
      .from("machine_ingestion_runs")
      .insert({
        machine_id: VB750_ID,
        organization_id: ORG_ID,
        started_by: SYSTEM_USER_ID,
        status: "running",
        current_phase: "EXTRACT",
        total_documents: 4,
        processed_documents: 0,
        successful_documents: 0,
        failed_documents: 0,
      })
      .select("id")
      .single();

    if (runError || !run) {
      console.log("❌ Error creating run:", runError?.message);
      throw new Error("Failed to create run");
    }

    const runId = run.id;
    console.log(`✓ Run ID: ${runId}`);

    // Get target documents
    console.log(`\n📝 Step 2: Getting target documents...`);
    const targetNames = [
      "08 VB750DK-m2021 EU V Instructions d'entretien V401.pdf",
      "09 VB750DK-m2021 EU V Plan de graissage V230.pdf",
      "12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf",
      "14-1 VB750DK-1208 Schéma hydraulique.pdf"
    ];

    const { data: docs } = await supabase
      .from("machine_documents")
      .select("*")
      .eq("machine_id", VB750_ID)
      .in("filename", targetNames);

    console.log(`✓ Found ${docs?.length || 0} target documents`);
    for (const doc of (docs || [])) {
      console.log(`  - ${doc.filename}`);
    }

    // Run extraction and consolidation
    console.log(`\n📝 Step 3: Running extraction for all documents...`);
    try {
      await service.runAllDocumentExtracts(runId);
      console.log(`✓ Extraction complete`);
    } catch (err) {
      console.error(`✗ Extraction error:`, (err as Error).message);
      // Continue anyway
    }

    console.log(`\n📝 Step 4: Running consolidation...`);
    try {
      const kbId = await service.runConsolidation(runId);
      console.log(`✓ Consolidation complete. KB ID: ${kbId}`);
    } catch (err) {
      console.error(`✗ Consolidation error:`, (err as Error).message);
      // Don't throw - consolidation might have partial success
    }

    // Verify
    console.log(`\n📊 Step 5: Verifying results...`);
    const { data: entities } = await supabase
      .from("machine_kb_entities")
      .select("entity_type")
      .eq("machine_id", VB750_ID);

    const byType: Record<string, number> = {};
    for (const e of (entities || [])) {
      byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
    }

    console.log(`\n✅ RESULTS:`);
    console.log(`  Total entities: ${entities?.length || 0}`);
    for (const [type, count] of Object.entries(byType)) {
      console.log(`  - ${type}: ${count}`);
    }

    console.log(`\n✅ Repair execution complete!`);

  } catch (err) {
    console.error("Fatal error:", (err as Error).message);
    console.error("Stack:", (err as Error).stack);
    process.exit(1);
  }

  process.exit(0);
}

repairVB750().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
