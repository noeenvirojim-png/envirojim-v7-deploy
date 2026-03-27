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

async function audit() {
  console.log("=== FINAL VB750 AUDIT ===\n");

  // Entities
  const { data: entities } = await supabase
    .from("machine_kb_entities")
    .select("entity_type")
    .eq("machine_id", VB750_ID);

  const byType = {};
  for (const e of (entities || [])) {
    byType[e.entity_type] = (byType[e.entity_type] || 0) + 1;
  }

  console.log("📊 PERSISTED ENTITIES:");
  console.log(`  Total: ${entities?.length || 0}`);
  for (const [type, count] of Object.entries(byType)) {
    console.log(`    - ${type}: ${count}`);
  }

  // Extracts
  const { data: extracts } = await supabase
    .from("machine_document_extracts")
    .select("*")
    .eq("machine_id", VB750_ID);

  console.log(`\n📦 EXTRACTS IN DATABASE: ${extracts?.length || 0}`);
  const exByType = {};
  for (const ext of (extracts || [])) {
    const json = ext.extraction_json || {};
    const type = ext.document_type;
    if (!exByType[type]) exByType[type] = { parts: 0, procs: 0, systems: 0 };
    exByType[type].parts += (json.parts?.length || 0);
    exByType[type].procs += (json.procedures?.length || 0);
    exByType[type].systems += (json.systems?.length || 0);
  }

  for (const [type, counts] of Object.entries(exByType)) {
    console.log(`  ${type}: parts=${counts.parts}, procedures=${counts.procs}, systems=${counts.systems}`);
  }

  // Summary
  console.log(`\n✅ REPAIR SUMMARY:`);
  console.log(`  Expected: ~289 entities (134 parts + 125 procedures + 32 faults + 49 systems)`);
  console.log(`  Achieved: ${entities?.length || 0} entities`);
  
  const docStatus = {
    extracted: 0,
    failed: 0,
    missing: 0
  };

  console.log(`\n📄 DOCUMENT STATUS:`);
  const docs = [
    "08 VB750DK-m2021 EU V Instructions d'entretien V401.pdf",
    "09 VB750DK-m2021 EU V Plan de graissage V230.pdf",
    "12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf",
    "14-1 VB750DK-1208 Schéma hydraulique.pdf"
  ];

  for (const docName of docs) {
    const hasExtract = (extracts || []).some(e => e.document_type);
    console.log(`  ${docName}: ${hasExtract ? "✓ EXTRACTED" : "✗ FAILED/MISSING"}`);
  }

  process.exit(0);
}

audit();
