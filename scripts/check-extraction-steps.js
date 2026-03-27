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

async function checkSteps() {
  const { data: steps } = await supabase
    .from("machine_ingestion_steps")
    .select("*")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111")
    .eq("phase", "EXTRACT")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log(`Found ${steps?.length || 0} extraction steps\n`);

  for (const step of (steps || [])) {
    console.log(`${step.status}: ${step.step_name}`);
    if (step.error_message) {
      console.log(`  ERROR: ${step.error_message.substring(0, 200)}`);
    }
  }

  process.exit(0);
}

checkSteps();
