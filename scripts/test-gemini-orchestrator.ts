import { config } from "dotenv";
import { resolve } from "path";
import { GeminiOrchestrator } from "../src/lib/ai/GeminiOrchestrator";

// Load .env.local specifically
config({ path: resolve(__dirname, "../.env.local") });

async function runTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "mock-gemini-key") {
    console.error("[FAIL] GEMINI_API_KEY missing or mock value even after loading .env.local.");
    process.exit(1);
  }

  const orchestrator = new GeminiOrchestrator(apiKey);

  const rawText = `
TECHNICAL MANUAL - TITAN 500 INDUSTRIAL PUMP
Manufacturer: EnviroJim Systems
Model: Titan 500 (Series B)
Reference: SN-500-2024

OVERVIEW:
The Titan 500 is a high-pressure hydraulic pump used in extreme environments.
The system consists of the Main Pump Assembly, the Cooling Subsystem, and the Electronic Control Unit.

PARTS LISTING:
1. Piston Seal (Part No: PS-998): Essential for maintaining pressure.
Criticality: Critical. Confidence: High.
2. Cooling Fan (Part No: CF-102): Prevents overheating.
Criticality: Medium. Confidence: High.

PROCEDURES:
Daily Startup:
1. Check oil levels.
2. Ensure power connection.
3. Press START button.
Warning: Do not operate if pressure exceeds 500 bar.
Frequency: Every 24 hours.

FAULTS:
Overheating (Code E02):
Causes: Blocked intake, Fan failure.
Solutions: Clean intake, Replace Cooling Fan.
Severity: High.
  `;

  console.log("--- STARTING GEMINI ORCHESTRATOR LIVE INTEGRATION TEST ---");

  try {
    const result = await orchestrator.extractMachineData(rawText);
    
    console.log("[OK] Integration test passed.");
    console.log("Summary:", result.summary);
    console.log("Parts found:", result.parts.length);
    console.log("Procedures found:", result.procedures.length);
    console.log("Faults found:", result.faults.length);
    
    console.log("\nGEMINI_ORCHESTRATOR_READY\nPASS");
  } catch (err: unknown) {
    console.error("[FAIL] Integration test failed:");
    console.error(err);
    process.exit(1);
  }
}

runTest();
