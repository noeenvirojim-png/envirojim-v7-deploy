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

const VB750_ID = "30000000-0000-0000-0000-111111111111";

async function resetStatus() {
  try {
    console.log("=== RESET DOCUMENT STATUS ===\n");

    // Get the 4 target documents
    const targetNames = [
      "08 VB750DK-m2021 EU V Instructions d'entretien V401.pdf",
      "09 VB750DK-m2021 EU V Plan de graissage V230.pdf",
      "12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf",
      "14-1 VB750DK-1208 Schéma hydraulique.pdf"
    ];

    const { data: docs } = await supabase
      .from("machine_documents")
      .select("id, filename, processing_status")
      .eq("machine_id", VB750_ID)
      .in("filename", targetNames);

    console.log(`Found ${docs.length} target documents\n`);

    // Change status to "parsing"
    for (const doc of docs) {
      const { error: updateError } = await supabase
        .from("machine_documents")
        .update({ processing_status: "parsing" })
        .eq("id", doc.id);

      if (updateError) {
        console.log(`✗ ${doc.filename}: ${updateError.message}`);
      } else {
        console.log(`✓ ${doc.filename}: completed -> parsing`);
      }
    }

    console.log(`\n✅ Documents ready for extraction!`);

  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }

  process.exit(0);
}

resetStatus();
