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

async function getError() {
  const { data: step } = await supabase
    .from("machine_ingestion_steps")
    .select("*")
    .eq("step_name", "Extract 08 VB750DK-m2021 EU V Instructions d'entretien V401.pdf")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!step) {
    console.log("Step not found");
    process.exit(1);
  }

  console.log("Document 08 Extraction Error:\n");
  console.log(step.error_message);
  
  process.exit(0);
}

getError();
