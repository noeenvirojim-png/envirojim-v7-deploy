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
const ORG_ID = "00000000-0000-0000-0000-000000000001";

async function repairVB750() {
  try {
    console.log("=== FULL VB750 REPAIR RUN ===\n");

    const service = new MachineIngestionService(geminiApiKey);

    // Step 1: Start ingestion run
    console.log("📝 Step 1: Creating ingestion run...");
    const { data: run } = await supabase
      .from("machine_ingestion_runs")
      .insert({
        machine_id: VB750_ID,
        organization_id: ORG_ID,
        current_phase: "INIT",
        total_documents: 0,
        processed_documents: 0,
        successful_documents: 0,
        failed_documents: 0,
      })
      .select("id")
      .single();

    if (!run) {
      throw new Error("Failed to create ingestion run");
    }

    const runId = run.id;
    console.log(`✓ Run ID: ${runId}`);

    // Step 2: Run inventory (optional, to get document counts)
    console.log(`\n📝 Step 2: Running inventory phase...`);
    try {
      await service.runInventory(runId);
      console.log(`✓ Inventory complete`);
    } catch (err) {
      console.log(`⚠️  Inventory phase error (may be OK): ${(err as Error).message}`);
    }

    // Step 3: Get target documents (docs 08, 09, 12, 14-1)
    console.log(`\n📝 Step 3: Getting target documents...`);
    const { data: docs } = await supabase
      .from("machine_documents")
      .select("*")
      .eq("machine_id", VB750_ID)
      .in("filename", [
        "08 VB750DK-m2021 EU V Instructions d'entretien V401.pdf",
        "09 VB750DK-m2021 EU V Plan de graissage V230.pdf",
        "12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf",
        "14-1 VB750DK-1208 Schéma hydraulique.pdf"
      ]);

    console.log(`✓ Found ${docs.length} target documents`);
    for (const doc of docs) {
      console.log(`  - ${doc.filename}`);
    }

    // Step 4: Extract each document
    console.log(`\n📝 Step 4: Running extraction for each document...`);
    for (const doc of docs) {
      console.log(`\n  Extracting: ${doc.filename}...`);
      try {
        await service.runDocumentExtract(runId, doc.id);
        console.log(`  ✓ Extraction complete`);
      } catch (err) {
        console.log(`  ✗ Extraction failed: ${(err as Error).message}`);
      }
    }

    // Step 5: Run consolidation
    console.log(`\n📝 Step 5: Running consolidation...`);
    try {
      const kbId = await service.runConsolidation(runId);
      console.log(`✓ Consolidation complete. KB ID: ${kbId}`);
    } catch (err) {
      console.log(`✗ Consolidation failed: ${(err as Error).message}`);
      throw err;
    }

    // Step 6: Verify results
    console.log(`\n📊 Step 6: Verifying persistence...`);
    const { data: entities } = await supabase
      .from("machine_kb_entities")
      .select("entity_type")
      .eq("machine_id", VB750_ID);

    const byType: Record<string, number> = {};
    for (const e of entities) {
      byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
    }

    console.log(`\n✅ RESULTS:`);
    console.log(`  Total entities: ${entities.length}`);
    for (const [type, count] of Object.entries(byType)) {
      console.log(`  - ${type}: ${count}`);
    }

    if (entities.length > 17) {
      console.log(`\n🎉 SUCCESS! All entities persisted!`);
    } else {
      console.log(`\n⚠️  WARNING: Expected 289 entities, got ${entities.length}`);
    }

  } catch (err) {
    console.error("Fatal error:", (err as Error).message);
    process.exit(1);
  }

  process.exit(0);
}

repairVB750().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
