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
const VB750_MACHINE_ID = "VB750DK-hammel-001";

console.log(`Using Supabase: ${SUPABASE_URL}`);
console.log(`Machine ID: ${VB750_MACHINE_ID}\n`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  try {
    console.log("=== VB750 SOURCE DATA DIAGNOSTIC ===\n");

    // Check machine_kb_entities
    console.log("Querying machine_kb_entities...");
    const { data: entities, error: entError } = await supabase
      .from("machine_kb_entities")
      .select("*")
      .eq("machine_id", VB750_MACHINE_ID)
      .order("created_at", { ascending: false });

    if (entError) {
      console.log(`✗ Error: ${entError.message}`);
    } else {
      console.log(`✓ Found ${entities.length} entities`);
      if (entities.length > 0) {
        const typeCount = {};
        const docCount = {};
        for (const e of entities) {
          typeCount[e.entity_type] = (typeCount[e.entity_type] || 0) + 1;
        }
        console.log("  By Type:");
        for (const [type, count] of Object.entries(typeCount)) {
          console.log(`    - ${type}: ${count}`);
        }
        console.log("\n  Sample entities:");
        for (let i = 0; i < Math.min(5, entities.length); i++) {
          const e = entities[i];
          console.log(`    [${e.entity_type}] ${e.canonical_name} (created: ${e.created_at})`);
        }
      }
    }

    // Check machine_kb_evidence
    console.log("\nQuerying machine_kb_evidence...");
    const { data: evidence, error: evError } = await supabase
      .from("machine_kb_evidence")
      .select("id")
      .eq("machine_id", VB750_MACHINE_ID);

    if (evError) {
      console.log(`✗ Error: ${evError.message}`);
    } else {
      console.log(`✓ Found ${evidence.length} evidence rows`);
    }

    // Check canonical tables
    console.log("\nQuerying canonical_clusters...");
    const { data: clusters, error: clError } = await supabase
      .from("canonical_clusters")
      .select("id")
      .eq("machine_id", VB750_MACHINE_ID);

    if (clError) {
      console.log(`✗ Error: ${clError.message}`);
    } else {
      console.log(`✓ Found ${clusters.length} clusters`);
    }

    // Summary
    console.log("\n=== SUMMARY ===");
    console.log(`VB750 Source Entities: ${entities?.length || 0}`);
    console.log(`VB750 Evidence Rows: ${evidence?.length || 0}`);
    console.log(`VB750 Canonical Clusters: ${clusters?.length || 0}`);
  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
