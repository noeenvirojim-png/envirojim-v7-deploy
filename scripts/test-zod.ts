import { ZodError } from "zod";
import { MachineExtractionSchema } from "../src/lib/ai/schemas/machineExtraction.schema";

const validMock = {
  machine_identity: {
    manufacturer: "EnviroJim",
    model: "Titan 500",
    serial_range: "SN001-SN100"
  },
  systems: ["Hydraulics", "Engine"],
  parts: [
    {
      name: "Main Pump",
      part_number: "MP-789",
      function: "Provides pressurized fluid to all subsystems",
      system: "Hydraulics",
      criticality: "high",
      confidence: "high",
      evidence: [{ snippet: "Main Pump MP-789", page: "12", language: "en" }]
    }
  ],
  procedures: [
    {
      name: "Startup Procedure",
      type: "operation",
      steps: [
        {
          step_number: 1,
          action: "Check fluid levels in the main tank",
          tools: ["Dipstick"],
          warnings: ["Wear gloves"],
          evidence: [{ snippet: "Check fluid levels", page: "4", language: "en" }]
        }
      ],
      evidence: [{ snippet: "Operation Guide Section 1", page: "4", language: "en" }]
    }
  ],
  faults: [
    {
      code: "E-01",
      description: "Low pressure detected in auxiliary circuit",
      causes: ["Leaky valve", "Blocked filter"],
      solutions: ["Replace filter", "Tighten valve"],
      severity: "medium",
      evidence: [{ snippet: "Fault code E-01: Low pressure", page: "45", language: "en" }]
    }
  ],
  technical_parameters: {
    "Operating Temperature": "10-45C",
    "Max Torque": "500Nm"
  },
  summary: "Comprehensive extraction for Titan 500"
};

const invalidMock = {
  // Missing machine_identity
  systems: ["Error"],
  parts: [
    {
      name: "S", // too short (min 2)
      part_number: "", // too short (min 1)
      function: "Fail", // too short (min 5)
      system: "Fail",
      criticality: "invalid_enum", // invalid enum
      confidence: "low",
      evidence: [] // missing evidence (min 1)
    }
  ]
};

console.log("--- STARTING ZOD SCHEMA TEST ---");

try {
  console.log("Testing Valid Mock...");
  MachineExtractionSchema.parse(validMock);
  console.log("[OK] Valid Mock passed validation.");
} catch (err: unknown) {
  if (err instanceof ZodError) {
    console.error("[FAIL] Valid Mock failed parsing:", err.errors);
  } else {
    console.error("[FAIL] Unexpected error:", err);
  }
  process.exit(1);
}

try {
  console.log("Testing Invalid Mock...");
  MachineExtractionSchema.parse(invalidMock);
  console.error("[FAIL] Invalid Mock unexpectedly passed validation.");
  process.exit(1);
} catch (err: unknown) {
  if (err instanceof ZodError) {
    console.log("[OK] Invalid Mock correctly failed validation.");
    console.log("Observed Errors:", err.errors.length);
  } else {
    console.error("[FAIL] Unexpected error during invalid mock test:", err);
    process.exit(1);
  }
}

console.log("\nZOD_SCHEMA_READY");
