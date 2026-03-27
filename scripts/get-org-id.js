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

async function getOrgId() {
  const { data: vb750 } = await supabase
    .from("machines")
    .select("organization_id")
    .eq("id", "30000000-0000-0000-0000-111111111111")
    .single();

  console.log("VB750 organization_id:", vb750?.organization_id);

  const { data: docs } = await supabase
    .from("machine_documents")
    .select("organization_id")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111")
    .limit(1);

  console.log("Machine document org_id:", docs?.[0]?.organization_id);

  process.exit(0);
}

getOrgId();
