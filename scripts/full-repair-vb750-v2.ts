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
    console.log("=== FULL VB750 REPAIR RUN v2 ===\n");

    const service = new MachineIngestionService(geminiApiKey);

    // Step 1: Use startRun instead
    console.log("📝 Step 1: Starting ingestion run...");
    const runId = await service.startRun(VB750_ID, ORG_ID);
    console.log(`✓ Run ID: ${runId}`);

    // Step 2: Run inventory
    console.log(`\n📝 Step 2: Running inventory phase...`);
    try {
      await service.runInventory(runId);
      console.log(`✓ Inventory complete`);
    } catch (err) {
      console.log(`⚠️  Inventory phase: ${(err as Error).message}`);
    }

    // Step 3: Run extraction for all documents
    console.log(`\n📝 Step 3: Running extraction phase...`);
    try {
      await service.runAllDocumentExtracts(runId);
      console.log(`✓ Extraction complete`);
    } catch (err) {
      console.log(`⚠️  Extraction error: ${(err as Error).message}`);
    }

    // Step 4: Run consolidation
    console.log(`\n📝 Step 4: Running consolidation phase...`);
    try {
      const kbId = await service.runConsolidation(runId);
      console.log(`✓ Consolidation complete. KB ID: ${kbId}`);
    } catch (err) {
      console.log(`✗ Consolidation failed: ${(err as Error).message}`);
      throw err;
    }

    // Step 5: Verify results
    console.log(`\n📊 Step 5: Verifying persistence...`);
    const { data: entities, error: entError } = await supabase
      .from("machine_kb_entities")
      .select("entity_type")
      .eq("machine_id", VB750_ID);

    if (entError) {
      console.log(`❌ Query error: ${entError.message}`);
    } else {
      const byType: Record<string, number> = {};
      for (const e of entities) {
        byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
      }

      console.log(`\n✅ RESULTS:`);
      console.log(`  Total entities: ${entities.length}`);
      for (const [type, count] of Object.entries(byType)) {
        console.log(`  - ${type}: ${count}`);
      }

      if (entities.length >= 150) {
        console.log(`\n🎉 SUCCESS! Majority of entities persisted!`);
      } else {
        console.log(`\n⚠️  Expected ~289 entities, got ${entities.length}`);
      }
    }

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
