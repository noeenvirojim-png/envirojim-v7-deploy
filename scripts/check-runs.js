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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRuns() {
  try {
    console.log("=== INGESTION RUN LOGS ===\n");

    // Check ingestion_runs
    const { data: runs, error: runError } = await supabase
      .from("machine_ingestion_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (runError) {
      console.log(`✗ Ingestion Runs Error: ${runError.message}`);
    } else {
      console.log(`✓ Found ${runs.length} ingestion runs\n`);
      for (const run of runs) {
        console.log(`Run: ${run.id}`);
        console.log(`  Machine: ${run.machine_id}`);
        console.log(`  Current Phase: ${run.current_phase}`);
        console.log(`  Documents: ${run.processed_documents}/${run.total_documents}`);
        console.log(`  Successful: ${run.successful_documents}`);
        console.log(`  Failed: ${run.failed_documents}`);
        console.log(`  Created: ${run.created_at}`);
        console.log();
      }
    }

    // Check machine_ingestion_steps
    const { data: steps, error: stepError } = await supabase
      .from("machine_ingestion_steps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (stepError) {
      console.log(`✗ Steps Error: ${stepError.message}`);
    } else {
      console.log(`\n✓ Found ${steps.length} steps\n`);
      const stepsByPhase = {};
      for (const step of steps) {
        if (!stepsByPhase[step.phase]) {
          stepsByPhase[step.phase] = [];
        }
        stepsByPhase[step.phase].push(step);
      }

      for (const [phase, phaseSteps] of Object.entries(stepsByPhase)) {
        console.log(`${phase}:`);
        for (const step of phaseSteps.slice(0, 5)) {
          console.log(`  - ${step.step_name}: ${step.status}`);
        }
      }
    }

    // Check ingestion_error_logs
    const { data: errors, error: errError } = await supabase
      .from("ingestion_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (errError) {
      console.log(`\n✗ Error Logs: ${errError.message}`);
    } else if (errors.length > 0) {
      console.log(`\n✓ Found ${errors.length} error logs\n`);
      for (const err of errors) {
        console.log(`Error in ${err.phase}:`);
        console.log(`  ${err.error_message}`);
        console.log(`  Created: ${err.created_at}`);
        console.log();
      }
    } else {
      console.log(`\n✓ No error logs found`);
    }

  } catch (err) {
    console.error("Fatal error:", err.message || err);
  }

  process.exit(0);
}

checkRuns().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
