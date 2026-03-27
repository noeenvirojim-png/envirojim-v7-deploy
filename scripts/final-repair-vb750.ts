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
const USER_ID = "21206e89-612e-4d7e-8d23-52a976fbe271";

async function finalRepair() {
  try {
    console.log("=== FINAL VB750 REPAIR (ALL 4 DOCUMENTS) ===\n");

    const service = new MachineIngestionService(geminiApiKey);

    // Create ingestion run
    console.log("📝 Creating ingestion run...");
    const { data: run } = await supabase
      .from("machine_ingestion_runs")
      .insert({
        machine_id: VB750_ID,
        organization_id: ORG_ID,
        started_by: USER_ID,
        status: "running",
        current_phase: "EXTRACT",
        total_documents: 4,
        processed_documents: 0,
        successful_documents: 0,
        failed_documents: 0,
      })
      .select("id")
      .single();

    if (!run) throw new Error("Failed to create run");
    const runId = run.id;
    console.log(`✓ Run ID: ${runId}\n`);

    // Extract
    console.log("📝 Running extraction for all 4 documents...");
    try {
      await service.runAllDocumentExtracts(runId);
      console.log(`✓ Extraction complete\n`);
    } catch (err) {
      console.error(`✗ Extraction error: ${(err as Error).message}`);
    }

    // Consolidate
    console.log("📝 Running consolidation...");
    try {
      const kbId = await service.runConsolidation(runId);
      console.log(`✓ Consolidation complete. KB ID: ${kbId}\n`);
    } catch (err) {
      console.error(`✗ Consolidation error: ${(err as Error).message}`);
      throw err;
    }

    // Verify
    console.log("📊 Verifying persistence...\n");
    const { data: entities } = await supabase
      .from("machine_kb_entities")
      .select("entity_type")
      .eq("machine_id", VB750_ID);

    const byType: Record<string, number> = {};
    for (const e of (entities || [])) {
      byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
    }

    console.log(`✅ FINAL RESULTS:`);
    console.log(`  Total entities: ${entities?.length || 0}`);
    console.log(`  Parts: ${byType.part || 0}`);
    console.log(`  Procedures: ${byType.procedure || 0}`);
    console.log(`  Maintenance Tasks: ${byType.maintenance_task || 0}`);
    console.log(`  Systems: ${byType.system || 0}`);
    console.log(`  Fault Cases: ${byType.fault_case || 0}`);

    if ((entities?.length || 0) > 150) {
      console.log(`\n🎉 SUCCESS! Source persistence repair complete!`);
    } else {
      console.log(`\n⚠️  Results below expected (expected ~289 entities)`);
    }

  } catch (err) {
    console.error("Fatal error:", (err as Error).message);
    process.exit(1);
  }

  process.exit(0);
}

finalRepair();
