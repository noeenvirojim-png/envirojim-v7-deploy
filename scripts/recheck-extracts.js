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

async function checkExtracts() {
  const { data: extracts, error } = await supabase
    .from("machine_document_extracts")
    .select("*")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111");

  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log(`Found ${extracts.length} extracts for VB750\n`);
    
    let totalParts = 0, totalProc = 0, totalSys = 0;
    for (const ext of extracts) {
      const extraction = ext.extraction_json || {};
      const parts = extraction.parts?.length || 0;
      const procs = extraction.procedures?.length || 0;
      const systems = extraction.systems?.length || 0;
      totalParts += parts;
      totalProc += procs;
      totalSys += systems;
      
      console.log(`  parts=${parts}, procedures=${procs}, systems=${systems}`);
    }
    
    console.log(`\nTotals:`);
    console.log(`  Parts: ${totalParts}`);
    console.log(`  Procedures: ${totalProc}`);
    console.log(`  Systems: ${totalSys}`);
  }

  process.exit(0);
}

checkExtracts();
