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

async function capture() {
  // Get the failed doc08 step
  const { data: steps } = await supabase
    .from("machine_ingestion_steps")
    .select("*")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111")
    .ilike("step_name", "%Instructions%")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!steps || steps.length === 0) {
    console.log("No failed doc08 step found");
    process.exit(0);
  }

  const step = steps[0];
  const errorMsg = step.error_message || "";
  
  console.log("ERROR MESSAGE (first 3000 chars):");
  console.log(errorMsg.substring(0, 3000));
  console.log("\n---\n");
  console.log("ERROR MESSAGE (last 1000 chars):");
  console.log(errorMsg.substring(Math.max(0, errorMsg.length - 1000)));

  process.exit(0);
}

capture();
