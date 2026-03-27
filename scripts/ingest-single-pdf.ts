import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import { createClient } from "@supabase/supabase-js";

// Parameterizable: can be set via env vars, argv, or defaults for test
const TARGET_DOC_ID = process.env.TARGET_DOC_ID || process.argv[2] || "b55a083c-c4af-4dd1-b205-f9f5185841ad";
const MACHINE_ID = process.env.MACHINE_ID || "30000000-0000-0000-0000-111111111111";
const ORG_ID = process.env.ORG_ID || "30000000-0000-0000-0000-000000000000";
const USER_ID = process.env.USER_ID || "21206e89-612e-4d7e-8d23-52a976fbe271";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Reset ONLY target doc to "uploaded"
  const { data: doc, error: docErr } = await supabase
    .from("machine_documents")
    .update({ processing_status: "uploaded" })
    .eq("id", TARGET_DOC_ID)
    .select("id, filename")
    .single();

  if (docErr || !doc) {
    console.error("Failed to reset doc:", docErr?.message);
    process.exit(1);
  }
  console.log(`Resetting "${doc.filename}" to uploaded...`);
  console.log(`Doc reset: id=${doc.id}`);

  // 2. Clean up any previous extracts for this doc
  await supabase.from("machine_document_extracts").delete().eq("document_id", doc.id);
  await supabase.from("machine_document_inventory").delete().eq("document_id", doc.id);
  await supabase.from("machine_kb").delete().eq("machine_id", MACHINE_ID);
  await supabase.from("machine_kb_entities").delete().eq("machine_id", MACHINE_ID);
  await supabase.from("machine_kb_evidence").delete().eq("machine_id", MACHINE_ID);

  // 3. Run pipeline
  const service = new MachineIngestionService(apiKey);

  console.log("Phase: START_RUN...");
  const runId = await service.startRun(MACHINE_ID, ORG_ID, USER_ID);
  console.log(`Run ID: ${runId}`);

  console.log("Phase: INVENTORY...");
  await service.runInventory(runId);

  console.log("Phase: EXTRACT...");
  await service.runAllDocumentExtracts(runId);

  console.log("Phase: CONSOLIDATE...");
  const kbId = await service.runConsolidation(runId);
  console.log(`KB ID: ${kbId}`);

  // 4. Verify writes
  console.log("\n=== VERIFICATION ===");

  const { count: entCount } = await supabase
    .from("machine_kb_entities")
    .select("*", { count: "exact", head: true })
    .eq("run_id", runId);

  const { count: evCount } = await supabase
    .from("machine_kb_evidence")
    .select("*", { count: "exact", head: true })
    .eq("kb_id", kbId);

  const { data: parts } = await supabase
    .from("machine_kb_entities")
    .select("canonical_name, normalized_payload")
    .eq("run_id", runId)
    .eq("entity_type", "part")
    .limit(3);

  const { data: procedures } = await supabase
    .from("machine_kb_entities")
    .select("canonical_name, normalized_payload")
    .eq("run_id", runId)
    .eq("entity_type", "procedure")
    .limit(3);

  const { data: faults } = await supabase
    .from("machine_kb_entities")
    .select("canonical_name, normalized_payload")
    .eq("run_id", runId)
    .eq("entity_type", "fault_case")
    .limit(3);

  // Count by type
  const { count: partsCount } = await supabase
    .from("machine_kb_entities")
    .select("*", { count: "exact", head: true })
    .eq("run_id", runId)
    .eq("entity_type", "part");

  const { count: procCount } = await supabase
    .from("machine_kb_entities")
    .select("*", { count: "exact", head: true })
    .eq("run_id", runId)
    .eq("entity_type", "procedure");

  const { count: faultCount } = await supabase
    .from("machine_kb_entities")
    .select("*", { count: "exact", head: true })
    .eq("run_id", runId)
    .eq("entity_type", "fault_case");

  // Final doc status
  const { data: finalDoc } = await supabase
    .from("machine_documents")
    .select("processing_status")
    .eq("id", doc.id)
    .single();

  console.log(JSON.stringify({
    run_id: runId,
    kb_id: kbId,
    doc_status: finalDoc?.processing_status,
    total_entities: entCount,
    total_evidence: evCount,
    parts_written: partsCount,
    procedures_written: procCount,
    faults_written: faultCount,
    first_3_parts: parts,
    first_3_procedures: procedures,
    first_3_faults: faults,
  }, null, 2));

  console.log("PIPELINE_COMPLETE");
}

run().catch(err => {
  console.error("PIPELINE_ERROR:", err.message);
  process.exit(1);
});
