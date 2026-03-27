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
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`Using Supabase: ${SUPABASE_URL}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  try {
    console.log("=== TABLE INSPECTION ===\n");

    // Get ALL entities to see what's there
    console.log("Checking machine_kb_entities (first 10)...");
    const { data: entities, error: entError } = await supabase
      .from("machine_kb_entities")
      .select("*")
      .limit(10);

    if (entError) {
      console.log(`✗ Error: ${entError.message}`);
    } else {
      console.log(`✓ Found ${entities.length} entities`);
      for (const e of entities) {
        console.log(`\n  ID: ${e.id}`);
        console.log(`  Machine ID: ${e.machine_id} (type: ${typeof e.machine_id})`);
        console.log(`  Type: ${e.entity_type}`);
        console.log(`  Name: ${e.canonical_name}`);
        console.log(`  Created: ${e.created_at}`);
      }
    }

    // Get all unique machine IDs
    console.log("\n\nChecking unique machine IDs...");
    const { data: allMachines, error: machError } = await supabase
      .from("machine_kb_entities")
      .select("machine_id")
      .limit(100);

    if (machError) {
      console.log(`✗ Error: ${machError.message}`);
    } else {
      const uniqueMachines = new Set(allMachines.map(m => m.machine_id));
      console.log(`\nUnique machine IDs in database:`);
      for (const mid of uniqueMachines) {
        console.log(`  - ${mid}`);
      }
    }

    // Check Titan 500
    console.log("\n\nChecking Titan 500 data...");
    const { data: titan, error: titanError } = await supabase
      .from("machine_kb_entities")
      .select("id, entity_type")
      .eq("machine_id", "30000000-0000-0000-0000-222222222222")
      .limit(5);

    if (titanError) {
      console.log(`✗ Error: ${titanError.message}`);
    } else {
      console.log(`✓ Found ${titan.length} Titan entities`);
    }

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

inspect().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
