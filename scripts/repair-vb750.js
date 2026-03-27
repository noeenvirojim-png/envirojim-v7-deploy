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

// VB750 machine ID
const VB750_ID = "30000000-0000-0000-0000-111111111111";

async function repairVB750() {
  try {
    console.log("=== VB750 PERSISTENCE REPAIR ===\n");

    // Step 1: Get VB750 machine documents
    console.log("📋 Step 1: Retrieving VB750 documents...");
    const { data: docs, error: docError } = await supabase
      .from("machine_documents")
      .select("*")
      .eq("machine_id", VB750_ID)
      .order("filename");

    if (docError) {
      console.log(`❌ Error: ${docError.message}`);
      process.exit(1);
    }

    console.log(`✓ Found ${docs.length} documents\n`);

    // Separate by status
    const completed = docs.filter(d => d.processing_status === "completed");
    const failed = docs.filter(d => d.processing_status === "failed");

    console.log(`  Completed: ${completed.length}`);
    for (const d of completed) {
      console.log(`    - ${d.filename}`);
    }

    console.log(`\n  Failed: ${failed.length}`);
    for (const d of failed) {
      console.log(`    - ${d.filename}`);
    }

    // Step 2: Get current persistence state
    console.log("\n📊 Step 2: Checking persistence...");
    const { data: entities, error: entError } = await supabase
      .from("machine_kb_entities")
      .select("id, entity_type")
      .eq("machine_id", VB750_ID);

    if (entError) {
      console.log(`❌ Error: ${entError.message}`);
    } else {
      console.log(`✓ Current entities in DB: ${entities.length}`);
      if (entities.length > 0) {
        const byType = {};
        for (const e of entities) {
          byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
        }
        for (const [type, count] of Object.entries(byType)) {
          console.log(`    - ${type}: ${count}`);
        }
      }
    }

    // Step 3: Reset documents to "pending" for re-extraction
    console.log("\n🔄 Step 3: Resetting document states to 'pending'...");
    for (const doc of completed) {
      const { error: updateError } = await supabase
        .from("machine_documents")
        .update({ processing_status: "pending" })
        .eq("id", doc.id);

      if (updateError) {
        console.log(`  ❌ ${doc.filename}: ${updateError.message}`);
      } else {
        console.log(`  ✓ Reset: ${doc.filename}`);
      }
    }

    console.log("\n✅ Repair preparation complete!");
    console.log("\nNext steps:");
    console.log("1. Run: npm run dev  (start the Next.js app)");
    console.log("2. Trigger extraction through the UI or API");
    console.log("3. Monitor persistence with: npm run check-vb750-persistence");

  } catch (err) {
    console.error("Fatal error:", err.message || err);
    process.exit(1);
  }

  process.exit(0);
}

repairVB750().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
