import { MachineIngestionService } from "../src/lib/ai/MachineIngestionService";

const EXPECTED_PUBLIC_METHODS = [
  "getRunStatus",
  "runAllDocumentExtracts",
  "runConsolidation",
  "runDocumentExtract",
  "runInventory",
  "startRun",
] as const;

async function run(): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const service = new MachineIngestionService(apiKey);

  console.log("[OK] Service instantiated");
  console.log("Available methods:");

  for (const methodName of EXPECTED_PUBLIC_METHODS) {
    const candidate = (service as any)[methodName];
    if (typeof candidate !== "function") {
      throw new Error(`Missing method: ${methodName}`);
    }

    console.log(`- ${methodName}`);
  }

  console.log("MACHINE_INGESTION_SERVICE_READY");
}

run().catch((error: unknown) => {
  console.error("[FAIL] MACHINE_INGESTION_SERVICE_TEST_FAIL");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error");
  }

  process.exit(1);
});
