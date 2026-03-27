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

async function checkMachines() {
  try {
    console.log("=== MACHINES & MANUALS ===\n");

    // Check machines
    const { data: machines, error: machError } = await supabase
      .from("machines")
      .select("*");

    if (machError) {
      console.log(`✗ Machines Error: ${machError.message}`);
    } else {
      console.log(`✓ Found ${machines.length} machines\n`);
      for (const m of machines) {
        console.log(`Machine: ${m.id}`);
        console.log(`  Name: ${m.name}`);
        console.log(`  Serial: ${m.serial_number}`);
        console.log(`  Manufacturer: ${m.manufacturer}`);
        console.log(`  Model: ${m.model}`);
        console.log(`  Created: ${m.created_at}\n`);
      }
    }

    // Check manuals
    const { data: manuals, error: manError } = await supabase
      .from("manuals")
      .select("*");

    if (manError) {
      console.log(`✗ Manuals Error: ${manError.message}`);
    } else {
      console.log(`✓ Found ${manuals.length} manuals\n`);
      for (const m of manuals) {
        console.log(`Manual: ${m.id}`);
        console.log(`  Machine: ${m.machine_id}`);
        console.log(`  Title: ${m.title}`);
        console.log(`  File URL: ${m.file_url}`);
        console.log(`  Created: ${m.created_at}\n`);
      }
    }

    // Check machine_documents
    const { data: docs, error: docError } = await supabase
      .from("machine_documents")
      .select("*")
      .limit(10);

    if (docError) {
      console.log(`✗ Machine Documents Error: ${docError.message}`);
    } else {
      console.log(`✓ Found ${docs.length} machine documents\n`);
      for (const d of docs) {
        console.log(`Document: ${d.id}`);
        console.log(`  Machine: ${d.machine_id}`);
        console.log(`  Filename: ${d.filename}`);
        console.log(`  Type: ${d.document_type}`);
        console.log(`  Status: ${d.processing_status}\n`);
      }
    }

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

checkMachines().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
