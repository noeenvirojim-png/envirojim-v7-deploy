import { createAdminClient } from "../src/lib/supabase/admin";
import { GeminiOrchestrator } from "../src/lib/ai/GeminiOrchestrator";
const { PDFParse } = require("pdf-parse");
import { ZodError } from "zod";

async function run() {
  console.log("--- E2E PDF PURE TEST START ---");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const supabase = createAdminClient();
  const orchestrator = new GeminiOrchestrator(apiKey);

  // 1. Fetch document (seeded with real binary content)
  const { data: doc, error: docErr } = await supabase
    .from("machine_documents")
    .select("*")
    .eq("filename", "test-seed.pdf")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (docErr || !doc) {
    throw new Error("FAIL: No exploitable PDF found.");
  }
  console.log(`Document located: ${doc.id} (${doc.filename})`);

  // 2. Download from Storage
  const { data: blob, error: storageErr } = await supabase.storage
    .from("machine-documents")
    .download(doc.storage_path);

  if (storageErr || !blob) {
    throw new Error(`FAIL: Storage download failed: ${storageErr?.message}`);
  }
  console.log(`Download OK: ${blob.size} bytes`);

  // 3. PDF Text Extraction
  const buffer = Buffer.from(await blob.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const pdfData = await parser.getText();
  await parser.destroy();
  const rawText = pdfData.text;
  
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("FAIL: PDF extraction returned insufficient text.");
  }
  console.log("PDF Extraction OK");

  // 4. Pure Gemini Extraction (NO ARTIFICIAL CONTEXT)
  console.log("Calling Gemini Orchestrator (Pure extraction)...");
  const extraction = await orchestrator.extractMachineData(rawText);
  console.log("Extraction OK (Gemini + Zod)");

  // 5. Setup Run
  const { data: runObj, error: runErr } = await supabase
    .from("machine_ingestion_runs")
    .insert({
      machine_id: doc.machine_id,
      organization_id: doc.organization_id,
      status: "running",
      current_phase: "EXTRACT",
      total_documents: 1,
    })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = runObj.id;

  // 6. DB Persistence - Cleanup then Insert
  await supabase.from("machine_document_extracts").delete().match({ document_id: doc.id });
  const { error: extractErr } = await supabase
    .from("machine_document_extracts")
    .insert({
      run_id: runId,
      machine_id: doc.machine_id,
      organization_id: doc.organization_id,
      document_id: doc.id,
      version: 1,
      extraction_mode: "full",
      document_type: "manual",
      prompt_version: "v1",
      gemini_model: "gemini-flash-latest",
      extraction_json: extraction,
      schema_valid: true,
      status: "completed"
    });
  if (extractErr) throw extractErr;

  // 7. KB Creation
  await supabase.from("machine_kb").delete().match({ machine_id: doc.machine_id });
  const { data: kbObj, error: kbErr } = await supabase
    .from("machine_kb")
    .insert({
      machine_id: doc.machine_id,
      organization_id: doc.organization_id,
      run_id: runId,
      version: 1,
      status: "active",
      machine_profile: { model: extraction.machine_identity?.model || "Unknown" }
    })
    .select("id")
    .single();
  if (kbErr) throw kbErr;
  const kbId = kbObj.id;

  // 8. Persist Entities & Evidence with strict error checking
  const entities = [
    ...extraction.parts.map(p => ({ type: 'part', name: p.name, payload: p, confidence: p.confidence, crit: p.criticality })),
    ...extraction.procedures.map(p => ({ type: 'procedure', name: p.name, payload: p, confidence: 'high', crit: 'medium' })),
    ...extraction.faults.map(f => ({ type: 'fault_case', name: f.description.slice(0, 50), payload: f, confidence: 'high', crit: f.severity }))
  ];

  for (const item of entities) {
    const { data: entity, error: entErr } = await supabase
      .from("machine_kb_entities")
      .insert({
        kb_id: kbId,
        run_id: runId,
        machine_id: doc.machine_id,
        organization_id: doc.organization_id,
        entity_type: item.type as any,
        canonical_name: item.name,
        original_label: item.name,
        language: "en",
        confidence: item.confidence as any,
        status: "confirmed",
        criticality: item.crit as any,
        normalized_payload: item.payload
      })
      .select("id")
      .single();
    if (entErr) throw entErr;

    const evidences = (item.payload as any).evidence || [];
    for (const ev of evidences) {
      const { error: evErr } = await supabase.from("machine_kb_evidence").insert({
        entity_id: entity.id,
        kb_id: kbId,
        machine_id: doc.machine_id,
        organization_id: doc.organization_id,
        source_document_id: doc.id,
        source_file_name: doc.filename,
        source_page: ev.page || "1",
        evidence_snippet: ev.snippet || "",
        language: ev.language || "en",
        confidence: item.confidence as any,
        raw_evidence: ev
      });
      if (evErr) throw evErr;
    }
  }

  // 9. RAW DB PROOF (Fetch actual rows)
  console.log("\n--- RAW DB PROOF ---");
  
  const { data: extractRow } = await supabase.from("machine_document_extracts").select("*").eq("document_id", doc.id).single();
  console.log("PROOFS_DOC_EXTRACT:", JSON.stringify(extractRow, null, 2));

  const { data: kbRow } = await supabase.from("machine_kb").select("*").eq("id", kbId).single();
  console.log("PROOFS_KB:", JSON.stringify(kbRow, null, 2));

  const { data: entitiesRows } = await supabase.from("machine_kb_entities").select("*").eq("kb_id", kbId);
  console.log("PROOFS_ENTITIES:", JSON.stringify(entitiesRows, null, 2));

  const { data: evidenceRows } = await supabase.from("machine_kb_evidence").select("*").eq("kb_id", kbId);
  console.log("PROOFS_EVIDENCE:", JSON.stringify(evidenceRows, null, 2));

  console.log("\n--- E2E PDF PURE TEST SUCCESS ---");
}

run().catch(err => {
  console.error("--- E2E PDF PURE TEST FAIL ---");
  if (err instanceof ZodError) {
    console.error("Zod Error:", JSON.stringify(err.errors, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
