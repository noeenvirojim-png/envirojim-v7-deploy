import { ZodError } from "zod";
import { MachineExtractionSchema } from "../src/lib/ai/schemas/machineExtraction.schema";

function parseGeminiJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Controlled fallback only for fenced JSON output
  }

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned);
}

async function run(): Promise<void> {
  console.log("--- STARTING GEMINI ORCHESTRATOR LOGIC TEST ---");

  const fakeGeminiOutput = `\`\`\`json
{
  "machine_identity": {
    "manufacturer": "EnviroJim",
    "model": "Titan 500",
    "serial_range": "SN001-SN100"
  },
  "systems": ["Hydraulics", "Engine"],
  "parts": [
    {
      "name": "Main Pump",
      "part_number": "MP-789",
      "function": "Provides pressurized fluid to all subsystems",
      "system": "Hydraulics",
      "criticality": "high",
      "confidence": "high",
      "evidence": [
        {
          "snippet": "Main Pump MP-789",
          "page": "12",
          "language": "en"
        }
      ]
    }
  ],
  "procedures": [
    {
      "name": "Startup Procedure",
      "type": "operation",
      "steps": [
        {
          "step_number": 1,
          "action": "Check fluid levels in the main tank",
          "tools": ["Dipstick"],
          "warnings": ["Wear gloves"],
          "evidence": [
            {
              "snippet": "Check fluid levels",
              "page": "4",
              "language": "en"
            }
          ]
        }
      ],
      "evidence": [
        {
          "snippet": "Operation Guide Section 1",
          "page": "4",
          "language": "en"
        }
      ]
    }
  ],
  "faults": [
    {
      "code": "E-01",
      "description": "Low pressure detected in auxiliary circuit",
      "causes": ["Leaky valve", "Blocked filter"],
      "solutions": ["Replace filter", "Tighten valve"],
      "severity": "medium",
      "evidence": [
        {
          "snippet": "Fault code E-01: Low pressure",
          "page": "45",
          "language": "en"
        }
      ]
    }
  ],
  "technical_parameters": {
    "Operating Temperature": "10-45C",
    "Max Torque": "500Nm"
  },
  "summary": "Comprehensive extraction for Titan 500"
}
\`\`\``;

  try {
    const parsed = parseGeminiJson(fakeGeminiOutput);
    const validated = MachineExtractionSchema.parse(parsed);

    console.log("[OK] LOGIC_TEST_PASS");
    console.log("Summary:", validated.summary);
    console.log("Parts count:", validated.parts.length);
    console.log("Procedures count:", validated.procedures.length);
    console.log("Faults count:", validated.faults.length);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      console.error("[FAIL] LOGIC_TEST_FAIL - ZodError");
      console.error(error.issues);
    } else if (error instanceof Error) {
      console.error("[FAIL] LOGIC_TEST_FAIL - Error");
      console.error(error.message);
    } else {
      console.error("[FAIL] LOGIC_TEST_FAIL - Unknown error");
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
