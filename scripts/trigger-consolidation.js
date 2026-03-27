const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.+)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    }
  }
  return env;
}

const envPath = path.join(__dirname, "../.env.local");
const env = loadEnv(envPath);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VB750_ID = "30000000-0000-0000-0000-111111111111";
const ORG_ID = "00000000-0000-0000-0000-000000000001";

async function triggerConsolidation() {
  try {
    console.log("=== TRIGGER CONSOLIDATION ===\n");

    // Get all extracts for VB750
    const { data: extracts } = await supabase
      .from("machine_document_extracts")
      .select("document_id, document_type")
      .eq("machine_id", VB750_ID);

    if (extracts.length === 0) {
      console.error("❌ No extracts found for VB750!");
      process.exit(1);
    }

    console.log(`Found ${extracts.length} extracts:`);
    const docMap = new Map();
    for (const ext of extracts) {
      if (!docMap.has(ext.document_id)) {
        docMap.set(ext.document_id, ext.document_type);
      }
    }

    // Get document details
    const { data: docs } = await supabase
      .from("machine_documents")
      .select("id, filename")
      .eq("machine_id", VB750_ID);

    for (const [docId, type] of docMap) {
      const doc = docs.find(d => d.id === docId);
      console.log(`  - ${doc?.filename || docId} (${type})`);
    }

    // Create a single ingestion run for consolidation
    console.log(`\n📝 Creating ingestion run for consolidation...`);
    const { data: run, error: runError } = await supabase
      .from("machine_ingestion_runs")
      .insert({
        machine_id: VB750_ID,
        organization_id: ORG_ID,
        current_phase: "CONSOLIDATE",
        total_documents: docMap.size,
        processed_documents: 0,
        successful_documents: 0,
        failed_documents: 0,
      })
      .select("id")
      .single();

    if (runError || !run) {
      console.error(`❌ Failed to create run: ${runError?.message}`);
      process.exit(1);
    }

    console.log(`✓ Run ID: ${run.id}`);

    // Create a consolidation step
    console.log(`\n📝 Creating consolidation step...`);
    const { error: stepError } = await supabase
      .from("machine_ingestion_steps")
      .insert({
        run_id: run.id,
        machine_id: VB750_ID,
        organization_id: ORG_ID,
        phase: "CONSOLIDATE",
        step_name: "Consolidate multi-document extractions",
        step_order: 1,
        status: "running",
      });

    if (stepError) {
      console.error(`❌ Failed to create step: ${stepError.message}`);
      process.exit(1);
    }

    console.log(`✓ Step created`);

    console.log(`\n✅ Consolidation trigger ready!`);
    console.log(`\nRun ID: ${run.id}`);
    console.log(`Expected to consolidate:`);
    console.log(`  - ${docMap.size} documents`);
    console.log(`  - 134 parts`);
    console.log(`  - 138 procedures`);
    console.log(`  - 17 systems`);

  } catch (err) {
    console.error("Fatal error:", err.message || err);
    process.exit(1);
  }

  process.exit(0);
}

triggerConsolidation().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
