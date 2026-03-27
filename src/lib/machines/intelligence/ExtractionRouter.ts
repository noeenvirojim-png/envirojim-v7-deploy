import { GoogleGenerativeAI } from "@google/generative-ai";
import { DocumentType } from "./taxonomy";
import { GEMINI_MODEL } from "./modelConfig";
import { inventoryPrompt as INVENTORY_PROMPT } from "./prompts/inventoryPrompt";
import { partsPrompt as PARTS_PROMPT } from "./prompts/partsPrompt";
import { proceduresPrompt as PROCEDURES_PROMPT } from "./prompts/proceduresPrompt";
import { troubleshootingPrompt as TROUBLESHOOTING_PROMPT } from "./prompts/troubleshootingPrompt";
import { electricalPrompt as ELECTRICAL_PROMPT } from "./prompts/electricalPrompt";
import { hydraulicPrompt as HYDRAULIC_PROMPT } from "./prompts/hydraulicPrompt";
import { contextPrompt as CONTEXT_PROMPT } from "./prompts/contextPrompt";

import { InventoryExtractionSchema } from "./schemas/inventory.schema";
import { PartsDocumentSchema } from "./schemas/parts.schema";
import { ProcedureDocumentSchema } from "./schemas/procedures.schema";
import { TroubleshootingDocumentSchema } from "./schemas/troubleshooting.schema";
import { ElectricalSchematicSchema } from "./schemas/electrical.schema";
import { HydraulicSchematicSchema } from "./schemas/hydraulic.schema";
import { ContextDocumentSchema } from "./schemas/context.schema";

export class ExtractionRouter {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractByDocumentType(
    documentType: DocumentType,
    rawText: string,
    filename: string
  ): Promise<any> {
    const model = this.client.getGenerativeModel({ model: GEMINI_MODEL });
    
    let prompt = "";
    let schema: any;

    switch (documentType) {
      case "parts_catalog":
      case "electrical_parts":
      case "hydraulic_parts":
        prompt = PARTS_PROMPT;
        schema = PartsDocumentSchema;
        break;
      case "operation":
      case "maintenance":
      case "startup":
      case "movement":
      case "cleaning":
      case "lubrication":
        prompt = PROCEDURES_PROMPT;
        schema = ProcedureDocumentSchema;
        break;
      case "troubleshooting":
        prompt = TROUBLESHOOTING_PROMPT;
        schema = TroubleshootingDocumentSchema;
        break;
      case "electrical_schematics":
        prompt = ELECTRICAL_PROMPT;
        schema = ElectricalSchematicSchema;
        break;
      case "hydraulic_schematics":
        prompt = HYDRAULIC_PROMPT;
        schema = HydraulicSchematicSchema;
        break;
      case "cover":
      case "introduction":
      case "intended_use":
      case "safety":
      case "appendix":
        prompt = CONTEXT_PROMPT;
        schema = ContextDocumentSchema;
        break;
      default:
        prompt = CONTEXT_PROMPT;
        schema = ContextDocumentSchema;
    }

    const fullPrompt = prompt.replace("{{TEXT}}", rawText);
    const result = await model.generateContent(fullPrompt);
    const text = (await result.response).text();
    
    const parsed = this.parseGeminiJson(text);
    return schema.parse(parsed);
  }

  async extractInventory(rawText: string): Promise<any> {
    const model = this.client.getGenerativeModel({ model: GEMINI_MODEL });
    const fullPrompt = INVENTORY_PROMPT.replace("{{TEXT}}", rawText);
    const result = await model.generateContent(fullPrompt);
    const text = (await result.response).text();
    
    const parsed = this.parseGeminiJson(text);
    return InventoryExtractionSchema.parse(parsed);
  }

  private parseGeminiJson(text: string): any {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Invalid JSON from Gemini: ${text.slice(0, 300)}`);
    }
  }
}
