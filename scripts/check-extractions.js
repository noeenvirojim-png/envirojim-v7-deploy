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

async function checkExtractions() {
  try {
    console.log("=== EXTRACTION STORAGE CHECK ===\n");

    // Get extraction_storage entries
    const { data: storages, error: storageError } = await supabase
      .from("extraction_storage")
      .select("*")
      .limit(100);

    if (storageError) {
      console.log(`❌ Error: ${storageError.message}`);
      process.exit(1);
    }

    console.log(`✓ Found ${storages.length} extraction storage entries\n`);

    // Get documents for VB750
    const { data: docs } = await supabase
      .from("machine_documents")
      .select("id, filename, document_type")
      .eq("machine_id", VB750_ID)
      .order("filename");

    // Check which documents have extractions
    for (const doc of docs) {
      const extracts = storages.filter(s => s.document_id === doc.id);
      if (extracts.length > 0) {
        console.log(`📄 ${doc.filename} (Type: ${doc.document_type})`);
        for (const ext of extracts) {
          const extraction = ext.extraction_json || {};
          const parts = extraction.parts?.length || 0;
          const procedures = extraction.procedures?.length || 0;
          const systems = extraction.systems?.length || 0;
          const faults = extraction.faults?.length || 0;
          console.log(`   - Extraction: parts=${parts}, procedures=${procedures}, systems=${systems}, faults=${faults}`);
          
          if (parts > 0) {
            console.log(`     Parts sample:`);
            for (let i = 0; i < Math.min(2, extraction.parts.length); i++) {
              const p = extraction.parts[i];
              console.log(`       - ${p.name} (${p.part_number})`);
            }
          }
          
          if (procedures > 0) {
            console.log(`     Procedures sample:`);
            for (let i = 0; i < Math.min(2, extraction.procedures.length); i++) {
              const pr = extraction.procedures[i];
              console.log(`       - ${pr.name} (${pr.type})`);
            }
          }
        }
      }
    }

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

checkExtractions().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
