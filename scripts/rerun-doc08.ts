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
const DOC08_ID = "9db5b13e-190b-423f-b0b9-06d8811593b2";

async function rerunDoc08() {
  console.log("RERUN DOC08 - Start\n");

  // Reset doc08 status
  const { error: resetErr } = await supabase
    .from("machine_documents")
    .update({ processing_status: "parsing" })
    .eq("id", DOC08_ID);
  
  if (resetErr) {
    console.log(`Reset failed: ${resetErr.message}`);
    process.exit(1);
  }
  console.log("✓ Doc08 status -> parsing");

  // Create run
  const { data: run, error: runErr } = await supabase
    .from("machine_ingestion_runs")
    .insert({
      machine_id: VB750_ID,
      organization_id: ORG_ID,
      started_by: USER_ID,
      status: "running",
      current_phase: "EXTRACT",
      total_documents: 1,
      processed_documents: 0,
      successful_documents: 0,
      failed_documents: 0,
    })
    .select("id")
    .single();

  if (runErr || !run) throw new Error("Run creation failed");
  console.log(`✓ Run created: ${run.id}`);

  // Extract
  const service = new MachineIngestionService(geminiApiKey);
  console.log("Extracting Doc08...");
  
  try {
    await service.runAllDocumentExtracts(run.id);
    console.log("✓ Extraction succeeded");
  } catch (err) {
    console.log(`✗ Extraction failed: ${(err as Error).message.substring(0, 200)}`);
    process.exit(1);
  }

  // Consolidate
  console.log("Consolidating...");
  try {
    await service.runConsolidation(run.id);
    console.log("✓ Consolidation succeeded");
  } catch (err) {
    console.log(`✗ Consolidation failed: ${(err as Error).message}`);
  }

  // Verify
  console.log("\nVerifying persistence:");
  const { data: entities } = await supabase
    .from("machine_kb_entities")
    .select("entity_type")
    .eq("machine_id", VB750_ID);

  const byType: Record<string, number> = {};
  for (const e of (entities || [])) {
    byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
  }

  console.log(`Total entities: ${entities?.length || 0}`);
  console.log(`  maintenance_task: ${byType.maintenance_task || 0}`);
  console.log(`  fault_case: ${byType.fault_case || 0}`);
  console.log(`  system: ${byType.system || 0}`);

  process.exit(0);
}

rerunDoc08().catch(err => {
  console.error("FATAL:", (err as Error).message);
  process.exit(1);
});
