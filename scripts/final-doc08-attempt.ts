import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const VB750_ID = "30000000-0000-0000-0000-111111111111";
const ORG_ID = "30000000-0000-0000-0000-000000000000";
const USER_ID = "21206e89-612e-4d7e-8d23-52a976fbe271";
const DOC08_ID = "9db5b13e-190b-423f-b0b9-06d8811593b2";

async function attempt() {
  console.log("FINAL DOC08 ATTEMPT\n");

  // Force doc08 to parsing
  await supabase.from("machine_documents").update({ processing_status: "parsing" }).eq("id", DOC08_ID);
  console.log("✓ Doc08 forced to parsing");

  // Get doc08 full record
  const { data: doc } = await supabase
    .from("machine_documents")
    .select("*")
    .eq("id", DOC08_ID)
    .single();

  if (!doc) throw new Error("Doc08 not found");

  // Create run
  const { data: run } = await supabase
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

  console.log(`✓ Run: ${run!.id}`);

  // Extract doc08 directly
  const service = new MachineIngestionService(process.env.GEMINI_API_KEY!);
  console.log("Extracting...");

  await service.runDocumentExtract(run!.id, doc as any);
  console.log("✓ runDocumentExtract completed");

  // Check extracts
  const { data: extracts } = await supabase
    .from("machine_document_extracts")
    .select("extraction_json")
    .eq("document_id", DOC08_ID)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!extracts || extracts.length === 0) {
    console.log("✗ No extracts created");
    process.exit(1);
  }

  const json = extracts[0].extraction_json as any;
  console.log(`✓ Extract created:`);
  console.log(`    procedures: ${json?.procedures?.length || 0}`);
  console.log(`    faults: ${json?.faults?.length || 0}`);
  console.log(`    systems: ${json?.systems?.length || 0}`);

  // Consolidate
  console.log("\nConsolidating...");
  await service.runConsolidation(run!.id);
  console.log("✓ Consolidation completed");

  // Final check
  const { data: entities } = await supabase
    .from("machine_kb_entities")
    .select("entity_type")
    .eq("machine_id", VB750_ID);

  const byType: Record<string, number> = {};
  for (const e of (entities || [])) {
    byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
  }

  console.log(`\nFinal persistence:`);
  console.log(`  maintenance_task: ${byType.maintenance_task || 0}`);
  console.log(`  fault_case: ${byType.fault_case || 0}`);

  process.exit(0);
}

attempt().catch(err => {
  console.error("BLOCKED:", (err as Error).message.substring(0, 200));
  process.exit(1);
});
