import { GeminiOrchestrator } from "../src/lib/ai/GeminiOrchestrator";

async function run(): Promise<void> {
  console.log("--- STARTING GEMINI ORCHESTRATOR REAL TEST ---");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    console.error("[FAIL] REAL_TEST_FAIL - Missing GEMINI_API_KEY");
    process.exit(1);
  }

  const orchestrator = new GeminiOrchestrator(apiKey);

  const rawText = `
Manufacturer: EnviroJim
Model: Titan 500

System Overview:
The machine contains a hydraulic system, engine system, cooling system, and electrical control system.

Part:
Main Pump MP-789
Function: Provides pressurized fluid to all subsystems.

Operation Procedure:
1. Check fluid levels in the main tank.
2. Verify emergency stop is released.
3. Start engine and monitor pressure gauge.

Fault:
E-01 Low pressure detected in auxiliary circuit.
Possible causes: Leaky valve, blocked filter.
Solutions: Replace filter, tighten valve.

Technical Parameters:
Operating Temperature: 10-45C
Max Torque: 500Nm

Summary:
Titan 500 industrial machine basic extraction sample.
  `;

  try {
    const result = await orchestrator.extractMachineData(rawText);
    console.log("[OK] REAL_TEST_PASS");
    console.log("Summary:", result.summary);
    console.log("Parts count:", result.parts.length);
    console.log("Procedures count:", result.procedures.length);
    console.log("Faults count:", result.faults.length);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("[FAIL] REAL_TEST_FAIL");
      console.error(error.message);
    } else {
      console.error("[FAIL] REAL_TEST_FAIL - Unknown error");
    }
    process.exit(1);
  }
}

run().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown top-level error");
  }
  process.exit(1);
});
