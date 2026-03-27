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

async function checkDoc08() {
  const { data: docs } = await supabase
    .from("machine_documents")
    .select("*")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111")
    .ilike("filename", "%Instructions%");

  console.log("Document 08:");
  if (docs.length > 0) {
    const doc = docs[0];
    console.log(`  ID: ${doc.id}`);
    console.log(`  Filename: ${doc.filename}`);
    console.log(`  Status: ${doc.processing_status}`);
    console.log(`  Type: ${doc.document_type}`);
  } else {
    console.log("  NOT FOUND");
  }

  // Check all VB750 docs
  console.log("\nAll VB750 documents:");
  const { data: allDocs } = await supabase
    .from("machine_documents")
    .select("id, filename, processing_status")
    .eq("machine_id", "30000000-0000-0000-0000-111111111111")
    .order("filename");

  for (const doc of (allDocs || [])) {
    const marker = doc.filename.includes("08") ? "⭐" : "  ";
    console.log(`${marker} ${doc.processing_status}: ${doc.filename}`);
  }

  process.exit(0);
}

checkDoc08();
