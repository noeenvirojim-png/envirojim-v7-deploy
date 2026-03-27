import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { MachineIngestionService } from "../src/lib/machines/intelligence/MachineIngestionService";
import { createClient } from "@supabase/supabase-js";
import { classifyDocument } from "../src/lib/machines/intelligence/classifyDocument";
import { extractByDocumentType } from "../src/lib/machines/intelligence/extractByDocumentType";
import { extractPdfPages } from "../src/domain/ai/utils/pdf-page-extractor";

const TARGET_DOC_ID = "9db5b13e-190b-423f-b0b9-06d8811593b2";
const MACHINE_ID = "30000000-0000-0000-0000-111111111111";
const ORG_ID = "30000000-0000-0000-0000-000000000000";

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get doc
  const { data: doc } = await supabase
    .from("machine_documents")
    .select("*")
    .eq("id", TARGET_DOC_ID)
    .single();

  if (!doc) { console.error("Doc not found"); process.exit(1); }

  // Download PDF
  const { data: pdfBuffer } = await supabase.storage
    .from("machine-documents")
    .download(doc.storage_path);

  if (!pdfBuffer) { console.error("PDF download failed"); process.exit(1); }

  // Extract text and pages
  const { rawText, pages } = await (async () => {
    const buffer = await pdfBuffer.arrayBuffer();
    const pages = await extractPdfPages(Buffer.from(buffer));
    const rawText = pages.map(p => p.text).join("\n---PAGE BREAK---\n");
    return { rawText, pages };
  })();

  console.log("=== EXTRACTION DEBUG ===\n");
  console.log("Document:", doc.filename);
  console.log("Pages extracted:", pages.length);
  console.log("Raw text length:", rawText.length);

  const docType = classifyDocument(doc.filename, rawText.slice(0, 5000));
  console.log("Document type detected:", docType);

  // Call extraction with raw response capture
  console.log("\n=== CALLING GEMINI ===\n");

  // Patch extractByDocumentType to capture raw response
  const origFetch = global.fetch;
  let rawGeminiResponse: string = "";

  (global as any).fetch = async (...args: any[]) => {
    const res = await origFetch.apply(global, args as any);
    if (res.url?.includes("googleapis.com")) {
      const clone = res.clone();
      const text = await clone.text();
      rawGeminiResponse = text;
    }
    return res;
  };

  try {
    const extraction = await extractByDocumentType({
      apiKey,
      documentType: docType,
      rawText: rawText.slice(0, 28000),
      fileName: doc.filename,
    });
    console.log("Extraction succeeded");
  } catch (err: any) {
    console.log("Extraction failed:", err.message);
  }

  // Restore fetch
  (global as any).fetch = origFetch;

  // Show results
  console.log("\n=== RAW GEMINI RESPONSE ===\n");
  console.log("Total length:", rawGeminiResponse.length);
  console.log("\nFirst 2000 chars:");
  console.log(rawGeminiResponse.slice(0, 2000));
  console.log("\nLast 500 chars:");
  console.log(rawGeminiResponse.slice(-500));

  // Analyze structure
  console.log("\n=== ANALYSIS ===\n");
  const hasMarkdownFence = /```/.test(rawGeminiResponse);
  const hasJsonFence = /```json/.test(rawGeminiResponse);
  const textBeforeJson = rawGeminiResponse.match(/^[^{]*/)?.[0]?.length || 0;
  const textAfterJson = rawGeminiResponse.match(/[^}]*$/)?.[0]?.length || 0;
  const hasTrailingComma = /,\s*[}\]]/.test(rawGeminiResponse);
  const hasSmartQuotes = /["'"]/.test(rawGeminiResponse);

  console.log("Has markdown fences:", hasMarkdownFence);
  console.log("Has ```json fences:", hasJsonFence);
  console.log("Text before JSON (chars):", textBeforeJson);
  console.log("Text after JSON (chars):", textAfterJson);
  console.log("Has trailing commas:", hasTrailingComma);
  console.log("Has smart quotes:", hasSmartQuotes);

  // Try to extract JSON block
  const jsonMatch = rawGeminiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    console.log("\nJSON block found, length:", jsonMatch[0].length);
    try {
      JSON.parse(jsonMatch[0]);
      console.log("JSON is valid");
    } catch (e: any) {
      console.log("JSON parse error:", e.message);
      // Show context around error
      const match = e.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        console.log("Error context:", jsonMatch[0].slice(Math.max(0, pos-50), pos+50));
      }
    }
  }
}

run().catch(err => console.error(err));
