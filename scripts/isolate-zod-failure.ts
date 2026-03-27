import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import { GeminiOrchestrator } from "../src/lib/machines/intelligence/GeminiOrchestrator";
import { MachineExtractionSchema } from "../src/lib/machines/intelligence/schemas/machineExtraction.schema";
import fs from "fs";
import path from "path";

const { PDFParse } = require("pdf-parse");

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  const orchestrator = new GeminiOrchestrator(apiKey!);
  const pdfPath = "C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service\\13-1 VB750DK-1208  Schémas électriques.pdf";
  
  console.log(`PDF FAILING: ${path.basename(pdfPath)}`);

  const buffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: buffer });
  const pdfData = await parser.getText();
  await parser.destroy();
  const rawText = pdfData.text;

  console.log("RAW TEXT SENT TO GEMINI (FIRST 500 CHARS):");
  console.log(rawText.slice(0, 500));
  console.log("...");

  const anyOrchestrator = orchestrator as any;
  const model = anyOrchestrator.client.getGenerativeModel({
    model: "gemini-flash-latest",
  });

  const prompt = `
You are an industrial machine document extraction engine.
Return ONLY valid JSON.
Do not use markdown.
Do not explain anything.
Do not add prose before or after JSON.

Extract the machine data from the following document text.
Your JSON MUST match this structure exactly:

{
  "machine_identity": {
    "manufacturer": "string",
    "model": "string",
    "serial_range": "string optional"
  },
  "systems": ["string"],
  "parts": [
    {
      "name": "string",
      "part_number": "string",
      "function": "string",
      "system": "string",
      "criticality": "low|medium|high|critical",
      "confidence": "low|medium|high",
      "evidence": [
        { "snippet": "string", "page": "string", "section": "string", "language": "string" }
      ]
    }
  ],
  "procedures": [
    {
      "name": "string",
      "type": "maintenance|repair|operation|diagnostic",
      "steps": [
        {
          "step_number": 1,
          "action": "string",
          "tools": ["string"],
          "warnings": ["string"],
          "duration_estimate": "string",
          "evidence": [
             { "snippet": "string", "page": "string", "section": "string", "language": "string" }
          ]
        }
      ],
      "frequency": "string",
      "evidence": [
        { "snippet": "string", "page": "string", "section": "string", "language": "string" }
      ]
    }
  ],
  "faults": [],
  "technical_parameters": {},
  "summary": "string"
}

Document text:
${rawText.slice(0, 12000)}
`;

  console.log("CALLING GEMINI...");
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawJsonText = response.text();

  console.log("RAW GEMINI JSON RESPONSE:");
  console.log(rawJsonText);

  console.log("RAW ZOD ERROR:");
  try {
    const cleaned = rawJsonText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    MachineExtractionSchema.parse(parsed);
    console.log("STATUS: PASS");
  } catch (err: any) {
    if (err.name === "ZodError") {
      process.stdout.write(JSON.stringify(err.errors, null, 2));
    } else {
      process.stdout.write(err.message);
    }
    console.log("\nSTATUS: FAIL");
  }
}

run();
