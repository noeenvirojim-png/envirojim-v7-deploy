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
  const { data: doc } = await supabase
    .from("machine_documents")
    .select("id, filename, processing_status")
    .eq("id", "9db5b13e-190b-423f-b0b9-06d8811593b2")
    .single();

  console.log(`Doc08 status: ${doc?.processing_status}`);
  process.exit(0);
}

check();
