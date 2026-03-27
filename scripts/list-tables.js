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

async function listTables() {
  try {
    console.log("=== DATABASE TABLES ===\n");

    // Try to query various tables that should exist
    const tablesToCheck = [
      "users",
      "machines",
      "machine_kb",
      "machine_kb_entities",
      "machine_kb_evidence",
      "machine_documents",
      "machine_ingestion_runs",
      "machine_ingestion_steps",
      "extraction_storage",
      "stored_extracts",
      "canonical_clusters",
      "canonical_cluster_aliases",
    ];

    for (const table of tablesToCheck) {
      const { error } = await supabase
        .from(table)
        .select("*")
        .limit(0);

      if (error && error.message.includes("Could not find")) {
        console.log(`❌ ${table} - NOT FOUND`);
      } else if (error && error.message.includes("permission denied")) {
        console.log(`⚠️  ${table} - PERMISSION DENIED`);
      } else if (error) {
        console.log(`⚠️  ${table} - ERROR: ${error.message}`);
      } else {
        console.log(`✅ ${table} - EXISTS`);
      }
    }

    // Try to list all tables via information_schema
    console.log("\nTrying to query information_schema...");
    const { data: tables, error: schemaError } = await supabase.rpc(
      "get_tables",
      {},
      { head: false }
    ).catch(e => ({ error: e, data: null }));

    if (schemaError) {
      console.log(`Note: RPC not available (${schemaError.message || "unknown"})`);
    } else {
      console.log("\nAll tables from schema:");
      if (tables) {
        for (const t of tables) {
          console.log(`  - ${t.tablename}`);
        }
      }
    }

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

listTables().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
