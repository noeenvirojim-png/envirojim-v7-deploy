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
  const { data: extracts } = await supabase
    .from("machine_document_extracts")
    .select("*")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log(`Found ${extracts?.length || 0} extracts\n`);

  const totalProc = extracts?.reduce((s, e) => s + ((e.extraction_json?.procedures?.length) || 0), 0) || 0;
  const totalParts = extracts?.reduce((s, e) => s + ((e.extraction_json?.parts?.length) || 0), 0) || 0;
  const totalSys = extracts?.reduce((s, e) => s + ((e.extraction_json?.systems?.length) || 0), 0) || 0;

  for (const ext of (extracts || [])) {
    const extraction = ext.extraction_json || {};
    const procs = extraction.procedures?.length || 0;
    const parts = extraction.parts?.length || 0;
    const systems = extraction.systems?.length || 0;
    console.log(`parts=${parts}, procedures=${procs}, systems=${systems}`);
  }

  console.log(`\nTotals: Parts=${totalParts}, Procedures=${totalProc}, Systems=${totalSys}`);

  process.exit(0);
}

checkExtracts();
