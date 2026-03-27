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

async function checkConsolidation() {
  try {
    console.log("=== CONSOLIDATION ANALYSIS ===\n");

    // Get ingestion runs
    const { data: runs } = await supabase
      .from("machine_ingestion_runs")
      .select("*")
      .eq("machine_id", VB750_ID)
      .order("created_at", { ascending: false });

    console.log(`Ingestion Runs: ${runs.length}\n`);
    for (const run of runs) {
      console.log(`Run: ${run.id}`);
      console.log(`  Phase: ${run.current_phase}`);
      console.log(`  Documents: ${run.processed_documents}/${run.total_documents}`);
      console.log(`  Status: Success=${run.successful_documents}, Failed=${run.failed_documents}`);
      console.log();
    }

    // Get steps
    const { data: steps } = await supabase
      .from("machine_ingestion_steps")
      .select("*")
      .eq("machine_id", VB750_ID)
      .order("created_at", { ascending: false });

    console.log(`Steps: ${steps.length}\n`);
    const stepsByPhase = {};
    for (const step of steps) {
      if (!stepsByPhase[step.phase]) stepsByPhase[step.phase] = [];
      stepsByPhase[step.phase].push(step);
    }

    for (const [phase, phaseSteps] of Object.entries(stepsByPhase)) {
      console.log(`${phase}:`);
      for (const step of phaseSteps.slice(0, 10)) {
        const status_icon = step.status === "completed" ? "✓" : step.status === "failed" ? "✗" : "⊙";
        console.log(`  ${status_icon} ${step.step_name}: ${step.status}`);
        if (step.error_message) {
          console.log(`     ERROR: ${step.error_message}`);
        }
      }
    }

    // Check for any errors
    const { data: errors } = await supabase
      .from("machine_ingestion_errors")
      .select("*")
      .eq("machine_id", VB750_ID)
      .order("created_at", { ascending: false })
      .limit(10);

    if (errors.length > 0) {
      console.log(`\n❌ ERRORS: ${errors.length}`);
      for (const err of errors) {
        console.log(`  [${err.phase}] ${err.error_message}`);
        if (err.error_details) {
          console.log(`    Details: ${JSON.stringify(err.error_details).substring(0, 200)}`);
        }
      }
    }

    // Check machine_kb for consolidation info
    const { data: kbs } = await supabase
      .from("machine_kb")
      .select("*")
      .eq("machine_id", VB750_ID);

    console.log(`\n📚 Machine KB Entries: ${kbs.length}`);
    for (const kb of kbs) {
      console.log(`  KB: ${kb.id}`);
      console.log(`    Parts: ${kb.stats?.parts_count || 0}`);
      console.log(`    Procedures: ${kb.stats?.procedures_count || 0}`);
      console.log(`    Faults: ${kb.stats?.fault_cases_count || 0}`);
    }

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

checkConsolidation().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
