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

async function addDoc08() {
  const { data: doc, error: err } = await supabase
    .from("machine_documents")
    .select("id, filename")
    .eq("id", "9db5b13e-190b-423f-b0b9-06d8811593b2")
    .single();

  if (err || !doc) {
    console.log("Error finding doc:", err?.message);
    process.exit(1);
  }

  console.log(`Found: ${doc.filename}`);

  const { error: updateError } = await supabase
    .from("machine_documents")
    .update({ processing_status: "parsing" })
    .eq("id", doc.id);

  if (updateError) {
    console.log(`Error: ${updateError.message}`);
    process.exit(1);
  }

  console.log(`✓ Changed to 'parsing'`);
  process.exit(0);
}

addDoc08();
