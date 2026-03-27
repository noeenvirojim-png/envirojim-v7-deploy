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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: extracts } = await supabase
    .from("machine_document_extracts")
    .select("*")
    .eq("document_id", "9db5b13e-190b-423f-b0b9-06d8811593b2")
    .order("created_at", { ascending: false });

  console.log(`Doc08 extracts: ${extracts?.length || 0}\n`);

  for (const ext of (extracts || [])) {
    const json = ext.extraction_json || {};
    console.log(`Created: ${ext.created_at}`);
    console.log(`  Run: ${ext.run_id}`);
    console.log(`  Status: ${ext.status}`);
    console.log(`  Procedures: ${json.procedures?.length || 0}`);
    console.log(`  Faults: ${json.faults?.length || 0}`);
    console.log(`  Systems: ${json.systems?.length || 0}`);
  }

  process.exit(0);
}

check();
