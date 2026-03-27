import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { createAdminClient } from "../src/lib/supabase/admin";
import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const supabase = createAdminClient();
  const service = new MachineIngestionService(apiKey);

  const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
  const { data: machine } = await supabase.from("machines").select("id").limit(1).single();
  const { data: user } = await supabase.from("users").select("id").limit(1).single();
  const { data: doc } = await supabase.from("machine_documents")
    .select("*")
    .eq("filename", "test-seed.pdf")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!org || !machine || !user || !doc) throw new Error("Context missing");

  // RESET
  await supabase.from("machine_documents").update({ processing_status: "failed" }).eq("machine_id", machine.id);
  await supabase.from("machine_documents").update({ processing_status: "uploaded" }).eq("id", doc.id);
  await supabase.from("machine_document_extracts").delete().eq("machine_id", machine.id);
  await supabase.from("machine_kb").delete().eq("machine_id", machine.id);
  await supabase.from("machine_document_inventory").delete().eq("machine_id", machine.id);
  await supabase.from("machine_ingestion_runs").delete().eq("machine_id", machine.id);

  console.log("EXECUTION_START");

  const { data: checkDocs } = await supabase.from("machine_documents").select("*");
  console.log("DEBUG_DOCS_IN_DB:", checkDocs);

  // START
  const runId = await service.startRun(machine.id, org.id, user.id);
  console.log(`Phase: START. RunID: ${runId}`);

  // PHASE 3: INVENTORY with retry on 429
  const runPhaseInventory = async () => {
    try {
      await service.runInventory(runId);
      console.log("Phase: INVENTORY OK");
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        console.log("Quota hit in Inventory. Retrying in 65s...");
        await new Promise(r => setTimeout(r, 65000));
        await service.runInventory(runId);
        console.log("Phase: INVENTORY OK (After retry)");
      } else throw err;
    }
  };
  await runPhaseInventory();

  // PHASE 4: EXTRACT with retry on 429
  const runPhaseExtract = async () => {
    try {
      await service.runAllDocumentExtracts(runId);
      console.log("Phase: EXTRACT OK");
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        console.log("Quota hit in Extract. Retrying in 65s...");
        await new Promise(r => setTimeout(r, 65000));
        await service.runAllDocumentExtracts(runId);
        console.log("Phase: EXTRACT OK (After retry)");
      } else throw err;
    }
  };
  await runPhaseExtract();

  // PHASE 5: CONSOLIDATE
  const kbId = await service.runConsolidation(runId);
  console.log(`Phase: CONSOLIDATE. KBID: ${kbId}`);
  console.log("EXECUTION_SUCCESS");

  // PROOF DATA
  const { data: q2 } = await supabase.from("machine_ingestion_steps").select("*").eq("run_id", runId).order("step_order", { ascending: true });
  console.log("PROOFS_STEPS_FINAL", JSON.stringify(q2, null, 2));

  const { data: q4 } = await supabase.from("machine_document_extracts").select("*").eq("run_id", runId);
  console.log("PROOFS_EXTRACTS", JSON.stringify(q4, null, 2));

  const { data: q5 } = await supabase.from("machine_kb").select("*").eq("id", kbId);
  console.log("PROOFS_KB", JSON.stringify(q5, null, 2));

  const { data: q6 } = await supabase.from("machine_kb_entities").select("*").eq("kb_id", kbId);
  console.log("PROOFS_ENTITIES", JSON.stringify(q6, null, 2));

  const { data: q7 } = await supabase.from("machine_kb_evidence").select("*").eq("kb_id", kbId);
  console.log("PROOFS_EVIDENCE", JSON.stringify(q7, null, 2));

  console.log("--- STATUS: PASS ---");
}

run().catch(err => {
  console.error("--- STATUS: FAIL ---");
  console.error(err);
  process.exit(1);
});
