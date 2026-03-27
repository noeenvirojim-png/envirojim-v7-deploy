import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { DocumentType } from "./documentTypes";
import { MachineInventorySchema, type MachineInventory } from "./schemas/machineInventory.schema";
import { GEMINI_MODEL } from "./modelConfig";
import { partsPrompt } from "./prompts/partsPrompt";
import { proceduresPrompt } from "./prompts/proceduresPrompt";
import { troubleshootingPrompt } from "./prompts/troubleshootingPrompt";
import { electricalPrompt } from "./prompts/electricalPrompt";
import { hydraulicPrompt } from "./prompts/hydraulicPrompt";
import { contextPrompt } from "./prompts/contextPrompt";
import { inventoryPrompt } from "./prompts/inventoryPrompt";
import { extractHydraulicSchemaVisualPOC } from "./poc/HydraulicSchemaPOC";

// --- LOCAL SCHEMAS ---

const EvidenceSchema = z.object({
  snippet: z.string(),
  page: z.string()
});

const PartsExtractionSchema = z.object({
  parts: z.array(z.object({
    name: z.string(),
    part_number: z.string(),
    function: z.string().optional(),
    system: z.string().optional(),
    confidence: z.enum(["low", "medium", "high"]),
    criticality: z.enum(["low", "medium", "high", "critical"]),
    evidence: z.array(EvidenceSchema)
  }))
});

const ProceduresExtractionSchema = z.object({
  procedures: z.array(z.object({
    name: z.string(),
    type: z.enum(["maintenance", "repair", "operation", "diagnostic"]),
    steps: z.array(z.object({
      step_number: z.number(),
      action: z.string(),
      tools: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
      duration_estimate: z.string().optional(),
      evidence: z.array(EvidenceSchema)
    })),
    evidence: z.array(EvidenceSchema)
  })),
  faults: z.array(z.object({
    code: z.string().optional(),
    description: z.string(),
    causes: z.array(z.string()),
    solutions: z.array(z.string()),
    severity: z.enum(["low", "medium", "high", "critical"]),
    evidence: z.array(EvidenceSchema)
  })).optional(),
  systems: z.array(z.string()).optional()
});

const TroubleshootingExtractionSchema = z.object({
  faults: z.array(z.object({
    code: z.string().optional(),
    description: z.string(),
    causes: z.array(z.string()),
    solutions: z.array(z.string()),
    severity: z.enum(["low", "medium", "high", "critical"]),
    evidence: z.array(EvidenceSchema)
  }))
});

const ElectricalExtractionSchema = z.object({
  electrical_components: z.array(z.object({
    name: z.string(),
    tag: z.string(),
    type: z.string(),
    location: z.string().optional(),
    evidence: z.array(EvidenceSchema)
  })),
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    signal: z.string().optional(),
    evidence: z.array(EvidenceSchema)
  }))
});

const HydraulicExtractionSchema = z.object({
  hydraulic_components: z.array(z.object({
    name: z.string(),
    tag: z.string(),
    type: z.string(),
    parameters: z.object({
      pressure: z.string().optional(),
      flow: z.string().optional()
    }),
    evidence: z.array(EvidenceSchema)
  })),
  circuits: z.array(z.object({
    name: z.string(),
    description: z.string(),
    evidence: z.array(EvidenceSchema)
  }))
});

const ContextExtractionSchema = z.object({
  summary: z.string().optional(),
  technical_metadata: z.object({
    revision: z.string().optional(),
    date: z.string().optional(),
    language: z.string().optional()
  }).partial().optional(),
  main_topics: z.array(z.string()).optional()
});

// --- PARSING HELPER ---

function parseGeminiJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown code fence if present
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // Extract JSON block: find first { and last }
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Invalid JSON output: ${text.slice(0, 300)}...`);
    }

    const jsonStr = jsonMatch[0];
    try {
      const repairedJson = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
      return JSON.parse(repairedJson);
    } catch {
      throw new Error(`Invalid JSON output: ${text.slice(0, 300)}...`);
    }
  }
}

// --- EXPORTS ---

export async function extractInventory(params: {
  apiKey: string;
  rawText: string;
  fileName: string;
}): Promise<MachineInventory> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const finalPrompt = inventoryPrompt + "\n\nDOCUMENT TEXT:\n" + params.rawText;
  const result = await model.generateContent(finalPrompt);
  const response = await result.response;
  const json = parseGeminiJson(response.text());

  return MachineInventorySchema.parse(json);
}

export async function extractByDocumentType(params: {
  apiKey: string;
  documentType: DocumentType;
  rawText: string;
  fileName: string;
}): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  // Route hydraulic_schematics to visual POC pipeline instead of text-based Gemini
  if (params.documentType === "hydraulic_schematics") {
    const pocResult = await extractHydraulicSchemaVisualPOC(params.rawText);
    // Map POC result to canonical HydraulicExtractionSchema format
    return {
      hydraulic_components: pocResult.detected_components.map((c) => ({
        name: c.name,
        tag: "", // Not recovered from schematic
        type: c.type,
        location: c.language === "de" ? "links/rechts reference" : "",
        evidence: c.evidence && c.evidence.length > 0
          ? c.evidence.map((e: any) => ({
              snippet: e.snippet,
              page: String(e.page),
            }))
          : [
              {
                snippet: `Component label detected from schematic: ${c.name}`,
                page: String(pocResult.page),
              },
            ],
      })),
      circuits: pocResult.possible_connections.map((conn) => ({
        circuit_id: conn.from + "_to_" + conn.to,
        description: conn.type,
        components: [conn.from, conn.to],
        evidence: [
          {
            snippet: `Connection: ${conn.from} → ${conn.to}`,
            page: String(pocResult.page),
          },
        ],
      })),
      summary: `Visual schematic extraction: ${pocResult.detected_components.length} components, ${pocResult.detected_ports.length} ports detected. ${pocResult.confidence_notes}`,
    };
  }

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  let prompt = "";
  let schema: z.ZodType<any> = z.any();

  switch (params.documentType) {
    case "parts_catalog":
      prompt = partsPrompt;
      schema = PartsExtractionSchema;
      break;
    case "troubleshooting":
      prompt = troubleshootingPrompt;
      schema = TroubleshootingExtractionSchema;
      break;
    case "operation":
    case "maintenance":
    case "startup":
    case "cleaning":
      prompt = proceduresPrompt;
      schema = ProceduresExtractionSchema;
      break;
    case "electrical_schematics":
      prompt = electricalPrompt;
      schema = ElectricalExtractionSchema;
      break;
    case "safety":
    case "intended_use":
    case "introduction":
    case "cover":
    case "other":
    default:
      prompt = contextPrompt;
      schema = ContextExtractionSchema;
  }

  const finalPrompt = prompt + "\n\nDOCUMENT TEXT:\n" + params.rawText;
  const result = await model.generateContent(finalPrompt);
  const response = await result.response;
  const json = parseGeminiJson(response.text());

  return schema.parse(json);
}
