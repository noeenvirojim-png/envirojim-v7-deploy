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

const envPath = path.join(__dirname, "./.env.local");
const env = loadEnv(envPath);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: all, error } = await supabase
    .from("machine_document_extracts")
    .select("*")
    .limit(5);

  if (error) {
    console.log("Error:", error.message);
  } else {
    console.log(`Found ${all?.length || 0} extracts total`);
    for (const ext of (all || [])) {
      console.log(`  - Machine: ${ext.machine_id}, Document: ${ext.document_id}`);
    }
  }
  process.exit(0);
}

check();
