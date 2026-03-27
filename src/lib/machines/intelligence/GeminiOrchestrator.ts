import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  MachineExtractionSchema,
  type MachineExtraction,
} from "./schemas/machineExtraction.schema";
import { GEMINI_MODEL } from "./modelConfig";

export class GeminiOrchestrator {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("Missing Gemini API key");
    }
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractMachineData(rawText: string): Promise<MachineExtraction> {
    if (!rawText || rawText.trim().length < 20) {
      throw new Error("Input text too short for extraction");
    }

    const model = this.client.getGenerativeModel({
      model: GEMINI_MODEL,
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
        {
          "snippet": "string",
          "page": "string",
          "section": "string optional",
          "language": "string"
        }
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
          "duration_estimate": "string optional",
          "evidence": [
            {
              "snippet": "string",
              "page": "string",
              "section": "string optional",
              "language": "string"
            }
          ]
        }
      ],
      "frequency": "string optional",
      "evidence": [
        {
          "snippet": "string",
          "page": "string",
          "section": "string optional",
          "language": "string"
        }
      ]
    }
  ],
  "faults": [
    {
      "code": "string optional",
      "description": "string",
      "causes": ["string"],
      "solutions": ["string"],
      "severity": "low|medium|high|critical",
      "evidence": [
        {
          "snippet": "string",
          "page": "string",
          "section": "string optional",
          "language": "string"
        }
      ]
    }
  ],
  "technical_parameters": {
    "key": "value"
  },
  "summary": "string"
}

Document text:
${rawText}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const parsed = this.parseGeminiJson(text);
    return MachineExtractionSchema.parse(parsed);
  }

  private parseGeminiJson(text: string): unknown {
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

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Gemini returned invalid JSON. First 300 chars: ${text.slice(0, 300)}`
      );
    }
  }
}
