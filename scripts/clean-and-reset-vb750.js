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

async function cleanAndReset() {
  try {
    console.log("=== VB750 CLEAN & RESET ===\n");

    // Step 1: Get current state
    console.log("📊 Step 1: Current State");
    const { data: entities } = await supabase
      .from("machine_kb_entities")
      .select("id")
      .eq("machine_id", VB750_ID);
    const { data: kbs } = await supabase
      .from("machine_kb")
      .select("id")
      .eq("machine_id", VB750_ID);
    const { data: runs } = await supabase
      .from("machine_ingestion_runs")
      .select("id")
      .eq("machine_id", VB750_ID);

    console.log(`  Entities: ${entities.length}`);
    console.log(`  Machine KBs: ${kbs.length}`);
    console.log(`  Ingestion Runs: ${runs.length}\n`);

    if (kbs.length === 0) {
      console.log("✓ No machine_kb to delete. Nothing to clean.");
      process.exit(0);
    }

    // Step 2: Delete machine_kb entries (cascades to entities)
    console.log("🗑️  Step 2: Deleting machine_kb entries...");
    for (const kb of kbs) {
      const { error: delError } = await supabase
        .from("machine_kb")
        .delete()
        .eq("id", kb.id);

      if (delError) {
        console.log(`  ❌ Failed to delete KB ${kb.id}: ${delError.message}`);
      } else {
        console.log(`  ✓ Deleted KB ${kb.id}`);
      }
    }

    // Step 3: Delete ingestion runs and steps
    console.log("\n🗑️  Step 3: Deleting ingestion runs...");
    for (const run of runs) {
      // Delete steps first
      const { error: stepError } = await supabase
        .from("machine_ingestion_steps")
        .delete()
        .eq("run_id", run.id);

      if (stepError) {
        console.log(`  ⚠️  Could not delete steps for ${run.id}: ${stepError.message}`);
      }

      // Delete the run
      const { error: runError } = await supabase
        .from("machine_ingestion_runs")
        .delete()
        .eq("id", run.id);

      if (runError) {
        console.log(`  ❌ Failed to delete run ${run.id}: ${runError.message}`);
      } else {
        console.log(`  ✓ Deleted run ${run.id}`);
      }
    }

    // Step 4: Verify cleanup
    console.log("\n✅ Step 4: Verifying cleanup...");
    const { data: newEntities } = await supabase
      .from("machine_kb_entities")
      .select("id")
      .eq("machine_id", VB750_ID);
    const { data: newKbs } = await supabase
      .from("machine_kb")
      .select("id")
      .eq("machine_id", VB750_ID);
    const { data: newRuns } = await supabase
      .from("machine_ingestion_runs")
      .select("id")
      .eq("machine_id", VB750_ID);

    console.log(`  Entities remaining: ${newEntities.length}`);
    console.log(`  Machine KBs remaining: ${newKbs.length}`);
    console.log(`  Runs remaining: ${newRuns.length}`);

    console.log("\n✅ VB750 CLEAN & RESET COMPLETE!");
    console.log("\nNext: Documents are still marked 'completed'. Extracts are still in DB.");
    console.log("Now re-run ingestion to consolidate with the fixed code.");

  } catch (err) {
    console.error("Fatal error:", err.message || err);
    process.exit(1);
  }

  process.exit(0);
}

cleanAndReset().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
