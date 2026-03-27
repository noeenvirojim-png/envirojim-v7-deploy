import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const DEFAULT_PDF_PATH = "C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service\\12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf";
const PDF_PATH = process.argv[2] || process.env.PDF_PATH || DEFAULT_PDF_PATH;
const MODEL = "gemini-2.5-flash";
const MAX_CHARS = 28000;

interface ExtractedItem {
  source_page: number;
  source_snippet: string;
  [key: string]: unknown;
}

async function main() {
  const result: Record<string, unknown> = {
    pdf_path: PDF_PATH,
    page_count: 0,
    text_extraction_ok: false,
    model_used: MODEL,
    machine_identity: null,
    parts: [],
    procedures: [],
    maintenance_tasks: [],
    faults: [],
    systems: [],
    evidence: [],
    unknowns: [],
    parts_count: 0,
    procedures_count: 0,
    maintenance_count: 0,
    faults_count: 0,
    evidence_count: 0,
    raw_error: null,
  };

  try {
    // ── 1. PDF text extraction via pipeline's pdf-parse v2 ──
    const buf = fs.readFileSync(PDF_PATH);
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const textResult = await parser.getText();
    await parser.destroy();

    const pages: Array<{ num: number; text: string }> = textResult.pages;
    result.page_count = pages.length;
    result.text_extraction_ok = true;

    // Format exactly like pipeline extractors: [PAGE N]\ntext
    const formattedText = pages
      .map((p) => `[PAGE ${p.num}]\n${p.text}`)
      .join("\n\n")
      .slice(0, MAX_CHARS);

    // ── 2. Single Gemini call — combined extraction prompt ──
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
You are an industrial equipment documentation extraction engine.
Analyze this spare parts / assemblies document for a HAMMEL VB 750 DK primary shredder.

Extract ALL of the following categories. For EACH item you extract, you MUST include:
- source_page: the page number where you found it
- source_snippet: an exact 1-2 line quote from the document proving the item exists

Return a single JSON object with this exact structure:

{
  "machine_identity": {
    "manufacturer": "string",
    "model": "string",
    "serial_or_type": "string",
    "year": "string",
    "document_title": "string",
    "source_page": number,
    "source_snippet": "exact quote"
  },
  "systems": [{
    "subsystem_code": "snake_case",
    "name": "string",
    "category": "string",
    "description": "string",
    "safety_critical": boolean,
    "source_page": number,
    "source_snippet": "exact quote"
  }],
  "parts": [{
    "part_number": "string (empty if not found)",
    "part_name": "string",
    "part_type": "filter|seal|bearing|shaft|belt|pump|motor|sensor|other",
    "is_wear_part": boolean,
    "is_consumable": boolean,
    "quantity_value": number,
    "quantity_status": "exact|estimated|unknown_but_required",
    "unit": "ea|L|kg|m|set",
    "source_page": number,
    "source_snippet": "exact 1-2 line quote"
  }],
  "procedures": [{
    "procedure_code": "snake_case",
    "title": "string",
    "procedure_type": "startup|shutdown|cleaning|inspection|troubleshooting|replacement|maintenance|emergency|configuration|other",
    "purpose": "string",
    "prerequisites": "string",
    "safety_notes": "string",
    "tools_required": "string",
    "completion_criteria": "string",
    "source_page": number,
    "source_snippet": "exact quote",
    "steps": [{"step_no": 1, "instruction": "string", "expected_result": "string", "safety_note": "string"}]
  }],
  "maintenance_tasks": [{
    "task_code": "snake_case",
    "title": "string",
    "interval_type": "daily|hours|days|weeks|months|years|event_based",
    "interval_value": number,
    "trigger_rule": "string",
    "task_description": "string",
    "severity_if_skipped": "low|medium|high|critical",
    "linked_procedure_code": "string or empty",
    "source_page": number,
    "source_snippet": "exact quote",
    "part_numbers": ["string"]
  }],
  "faults": [{
    "symptom_code": "snake_case",
    "symptom_title": "string",
    "normalized_symptom": "lowercase",
    "symptom_type": "mechanical|electrical|hydraulic|thermal|control|other",
    "severity_default": "low|medium|high|critical",
    "source_page": number,
    "source_snippet": "exact quote",
    "causes": [{
      "cause_code": "snake_case",
      "title": "string",
      "description": "string",
      "cause_type": "string",
      "likelihood_rank": number,
      "documentary_confidence": number
    }]
  }]
}

RULES:
- Only extract what is ACTUALLY in the document. Do NOT invent.
- If a category has nothing, return an empty array.
- Every item MUST have source_page and source_snippet with real quotes.
- This is a spare parts catalog — expect many parts, some systems, few or no procedures/faults.

Document:
${formattedText}
`.trim();

    console.log(`[prove] Calling ${MODEL} with ${formattedText.length} chars...`);
    const gemResult = await model.generateContent(prompt);
    const rawJson = gemResult.response.text().trim();
    const extracted = JSON.parse(rawJson);

    // ── 3. Map to output ──
    result.machine_identity = extracted.machine_identity ?? null;
    result.systems = extracted.systems ?? [];
    result.parts = extracted.parts ?? [];
    result.procedures = extracted.procedures ?? [];
    result.maintenance_tasks = extracted.maintenance_tasks ?? [];
    result.faults = extracted.faults ?? [];

    // Build evidence from all items that have source_page + source_snippet
    const evidence: Array<{ object_type: string; source_page: number; source_snippet: string }> = [];
    for (const [category, items] of Object.entries({
      system: extracted.systems,
      part: extracted.parts,
      procedure: extracted.procedures,
      maintenance_task: extracted.maintenance_tasks,
      fault: extracted.faults,
    })) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.source_page && item.source_snippet) {
            evidence.push({
              object_type: category,
              source_page: item.source_page,
              source_snippet: item.source_snippet,
            });
          }
        }
      }
    }
    result.evidence = evidence;
    result.unknowns = [];

    // Counts
    result.parts_count = (result.parts as unknown[]).length;
    result.procedures_count = (result.procedures as unknown[]).length;
    result.maintenance_count = (result.maintenance_tasks as unknown[]).length;
    result.faults_count = (result.faults as unknown[]).length;
    result.evidence_count = evidence.length;

    // Quality notes
    (result as any).extraction_quality_notes =
      `Spare parts catalog: ${result.parts_count} parts extracted from ${result.page_count} pages. ` +
      `${(result.systems as unknown[]).length} systems identified. ` +
      `Document is parts-focused — low procedure/fault count expected.`;
  } catch (e: any) {
    result.raw_error = e?.message ?? String(e);
  }

  // Write output
  const outDir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "single_pdf_structured.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`Written: ${outPath}`);

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log(`page_count: ${result.page_count}`);
  console.log(`text_extraction_ok: ${result.text_extraction_ok}`);
  console.log(`parts_count: ${result.parts_count}`);
  console.log(`procedures_count: ${result.procedures_count}`);
  console.log(`maintenance_count: ${result.maintenance_count}`);
  console.log(`faults_count: ${result.faults_count}`);
  console.log(`evidence_count: ${result.evidence_count}`);
  console.log(`raw_error: ${result.raw_error}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
