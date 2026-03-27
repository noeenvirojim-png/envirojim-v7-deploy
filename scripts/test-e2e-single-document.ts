import { createAdminClient } from "../src/lib/supabase/admin";
import { GeminiOrchestrator } from "../src/lib/ai/GeminiOrchestrator";
import { ZodError } from "zod";

async function run() {
  console.log("--- E2E TEST START ---");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const supabase = createAdminClient();
  const orchestrator = new GeminiOrchestrator(apiKey);

  // 1. Setup IDs
  let orgId = "";
  const { data: orgs } = await supabase.from("organizations").select("id").limit(1);
  if (orgs && orgs.length > 0) {
    orgId = orgs[0].id;
  } else {
    const { data: newOrg, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: "E2E Test Org" })
      .select("id")
      .single();
    if (orgErr) throw orgErr;
    orgId = newOrg.id;
  }

  const { data: newMachine, error: machErr } = await supabase
    .from("machines")
    .insert({ 
      organization_id: orgId, 
      serial_number: `E2E-SERIAL-${Date.now()}`, 
      model: "Titan 500",
      manufacturer: "EnviroJim"
    })
    .select("id")
    .single();
  if (machErr) throw machErr;
  const machineId = newMachine.id;

  // 2. Create Run
  const { data: runObj, error: runErr } = await supabase
    .from("machine_ingestion_runs")
    .insert({
      machine_id: machineId,
      organization_id: orgId,
      status: "running",
      current_phase: "EXTRACT",
      total_documents: 1,
    })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = runObj.id;

  // 3. Create Document Resource (Text-based E2E)
  const filename = `e2e-text-source-${Date.now()}.txt`;
  const { data: newDoc, error: docErr } = await supabase
    .from("machine_documents")
    .insert({
      machine_id: machineId,
      organization_id: orgId,
      filename,
      storage_path: `e2e/temp/${filename}`,
      processing_status: "completed",
      document_type: "manual",
      language: "en"
    })
    .select("id")
    .single();
  if (docErr) throw docErr;
  const documentId = newDoc.id;

  // 4. Gemini Extraction (Strict Zod handled by orchestrator)
  const rawText = `
    MACHINE: Titan 500
    MANUFACTURER: EnviroJim
    
    SYSTEM: Hydraulic Drive
    PART: Main Pump A1, Part No: P-100, Type: Critical, Function: Main pressure supply.
    
    PROCEDURE: Daily Pressure Calibration
    TYPE: maintenance
    STEP 1: Start machine.
    STEP 2: Read gauge PI-01.
    STEP 3: Adjust valve V-10.
    
    FAULT: ERR-09 - High Temperature
    DESCRIPTION: Hydraulic fluid overheating.
    CAUSES: Clogged cooler, low fluid.
    SOLUTIONS: Clean radiator, top up oil.
    SEVERITY: high
  `;

  const extraction = await orchestrator.extractMachineData(rawText);
  console.log("Extraction OK");

  // 5. Persist Extract metadata
  const { error: extractErr } = await supabase
    .from("machine_document_extracts")
    .insert({
      run_id: runId,
      machine_id: machineId,
      organization_id: orgId,
      document_id: documentId,
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

  // 6. Create KB
  const { data: kbObj, error: kbErr } = await supabase
    .from("machine_kb")
    .insert({
      machine_id: machineId,
      organization_id: orgId,
      run_id: runId,
      version: 1,
      status: "active",
      machine_profile: { model: extraction.machine_identity?.model || "Unknown" }
    })
    .select("id")
    .single();
  if (kbErr) throw kbErr;
  const kbId = kbObj.id;
  console.log(`KB created: ${kbId}`);

  // 7. Persist Entities (Parts, Procedures, Faults)
  // Mapping to machine_kb_entities
  const entitiesToInsert = [
    ...extraction.parts.map(p => ({ type: 'part', name: p.name, confidence: p.confidence, criticality: p.criticality, payload: p })),
    ...extraction.procedures.map(p => ({ type: 'procedure', name: p.name, confidence: 'high', criticality: 'medium', payload: p })),
    ...extraction.faults.map(f => ({ type: 'fault_case', name: f.description.slice(0, 50), confidence: 'high', criticality: f.severity, payload: f }))
  ];

  for (const item of entitiesToInsert) {
    const { data: entityFinal, error: entErr } = await supabase
      .from("machine_kb_entities")
      .insert({
        kb_id: kbId,
        run_id: runId,
        machine_id: machineId,
        organization_id: orgId,
        entity_type: item.type as any,
        canonical_name: item.name,
        original_label: item.name,
        language: "en",
        confidence: item.confidence as any,
        status: "confirmed",
        criticality: item.criticality as any,
        normalized_payload: item.payload
      })
      .select("id")
      .single();
    if (entErr) throw entErr;

    // 7.1 Persist Evidence specifically in machine_kb_evidence
    const evidences = (item.payload as any).evidence || [];
    for (const ev of evidences) {
      const { error: evErr } = await supabase
        .from("machine_kb_evidence")
        .insert({
          entity_id: entityFinal.id,
          kb_id: kbId,
          machine_id: machineId,
          organization_id: orgId,
          source_document_id: documentId,
          source_file_name: filename,
          source_page: ev.page || "1",
          section_title: ev.section || "",
          evidence_snippet: ev.snippet || "",
          language: ev.language || "en",
          confidence: item.confidence as any,
          raw_evidence: ev
        });
      if (evErr) throw evErr;
    }
  }

  // 8. FINAL DB VERIFICATION
  const { data: dbSummary, error: fetchErr } = await supabase
    .from("machine_kb_entities")
    .select("entity_type")
    .eq("kb_id", kbId);
  
  if (fetchErr) throw fetchErr;

  const partsCount = dbSummary?.filter(e => e.entity_type === 'part').length || 0;
  const proceduresCount = dbSummary?.filter(e => e.entity_type === 'procedure').length || 0;
  const faultsCount = dbSummary?.filter(e => e.entity_type === 'fault_case').length || 0;

  console.log(`Parts: ${partsCount}`);
  console.log(`Procedures: ${proceduresCount}`);
  console.log(`Faults: ${faultsCount}`);
  console.log("--- E2E TEST SUCCESS ---");
}

run().catch(err => {
  console.error("--- E2E TEST FAIL ---");
  if (err instanceof ZodError) {
    console.error("Zod Validation Error:", JSON.stringify(err.errors, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
