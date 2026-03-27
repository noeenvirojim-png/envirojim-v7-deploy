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

async function checkExtracts() {
  try {
    console.log("=== MACHINE_DOCUMENT_EXTRACTS CHECK ===\n");

    // Get all extracts for VB750
    const { data: extracts, error: extractError } = await supabase
      .from("machine_document_extracts")
      .select("*")
      .eq("machine_id", VB750_ID)
      .order("created_at", { ascending: false });

    if (extractError) {
      console.log(`❌ Error: ${extractError.message}`);
      process.exit(1);
    }

    console.log(`✓ Found ${extracts.length} extracts for VB750\n`);

    // Get VB750 documents for reference
    const { data: docs } = await supabase
      .from("machine_documents")
      .select("id, filename, document_type")
      .eq("machine_id", VB750_ID)
      .in("processing_status", ["completed"]);

    const docMap = new Map(docs.map(d => [d.id, d]));

    // Analyze extracts
    for (const ext of extracts) {
      const doc = docMap.get(ext.document_id);
      if (!doc) continue;

      const extraction = ext.extraction_json || {};
      const parts = extraction.parts?.length || 0;
      const procedures = extraction.procedures?.length || 0;
      const systems = extraction.systems?.length || 0;
      const faults = extraction.faults?.length || 0;

      console.log(`📄 ${doc.filename}`);
      console.log(`   Type: ${doc.document_type} | Mode: ${ext.extraction_mode}`);
      console.log(`   Status: ${ext.status} | Schema Valid: ${ext.schema_valid}`);
      console.log(`   Content: parts=${parts}, procedures=${procedures}, systems=${systems}, faults=${faults}`);

      if (parts > 0) {
        console.log(`   Parts (first 2):`);
        for (let i = 0; i < Math.min(2, extraction.parts.length); i++) {
          const p = extraction.parts[i];
          console.log(`     - ${p.name} (${p.part_number || 'NO_NUMBER'})`);
        }
      }

      if (procedures > 0) {
        console.log(`   Procedures (first 2):`);
        for (let i = 0; i < Math.min(2, extraction.procedures.length); i++) {
          const pr = extraction.procedures[i];
          console.log(`     - ${pr.name} (${pr.type})`);
        }
      }

      console.log();
    }

    // Summary
    const totalParts = extracts.reduce((s, e) => s + ((e.extraction_json?.parts?.length) || 0), 0);
    const totalProc = extracts.reduce((s, e) => s + ((e.extraction_json?.procedures?.length) || 0), 0);
    const totalSys = extracts.reduce((s, e) => s + ((e.extraction_json?.systems?.length) || 0), 0);

    console.log("=== SUMMARY ===");
    console.log(`Total Parts Available: ${totalParts}`);
    console.log(`Total Procedures Available: ${totalProc}`);
    console.log(`Total Systems Available: ${totalSys}`);

    // Check against database
    const { data: entities } = await supabase
      .from("machine_kb_entities")
      .select("entity_type")
      .eq("machine_id", VB750_ID);

    const entByType = {};
    for (const e of entities) {
      entByType[e.entity_type] = (entByType[e.entity_type] || 0) + 1;
    }

    console.log(`\nPersisted in Database:`);
    for (const [type, count] of Object.entries(entByType)) {
      console.log(`  - ${type}: ${count}`);
    }

    console.log(`\n❓ Missing: Parts=${totalParts - (entByType.part || 0)}, Procedures=${totalProc - (entByType.procedure || entByType.maintenance_task || 0)}`);

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

checkExtracts().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
