import { extractByDocumentType } from "../src/lib/machines/intelligence/extractByDocumentType";
import { extractPdfPages } from "../src/domain/ai/utils/pdf-page-extractor";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const geminiApiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const DOC08_ID = "9db5b13e-190b-423f-b0b9-06d8811593b2";
const VB750_ID = "30000000-0000-0000-0000-111111111111";

async function extractDoc08() {
  try {
    // Get doc08
    const { data: doc } = await supabase
      .from("machine_documents")
      .select("storage_path, filename")
      .eq("id", DOC08_ID)
      .single();

    if (!doc) throw new Error("Doc08 not found");

    console.log(`Extracting: ${doc.filename}\n`);

    // Get PDF
    const bucketName = "machine_documents";
    const { data: pdfData, error: dlError } = await supabase
      .storage
      .from(bucketName)
      .download(doc.storage_path);

    if (dlError || !pdfData) throw new Error(`Download failed: ${dlError?.message}`);

    // Extract pages
    const pages = await extractPdfPages(pdfData);
    const rawText = pages.map(p => p.text).join("\n");

    console.log(`📄 PDF extracted: ${pages.length} pages, ${rawText.length} chars\n`);

    // Extract with error capture
    try {
      const result = await extractByDocumentType({
        apiKey: geminiApiKey,
        documentType: "maintenance",
        rawText: rawText,
        fileName: doc.filename
      });

      console.log("✅ Extraction succeeded!");
      console.log(`Procedures: ${result.procedures?.length || 0}`);
      console.log(`Faults: ${result.faults?.length || 0}`);

    } catch (err) {
      const errMsg = (err as Error).message || "";
      console.log("❌ Extraction FAILED\n");
      console.log("Error:", errMsg.substring(0, 500));
      
      // Try to extract raw JSON from error
      if (errMsg.includes("Invalid JSON")) {
        const jsonStart = errMsg.indexOf("```json");
        if (jsonStart !== -1) {
          const rawJsonPart = errMsg.substring(jsonStart);
          console.log("\n=== RAW JSON IN ERROR (first 2000 chars) ===");
          console.log(rawJsonPart.substring(0, 2000));
          console.log("\n=== RAW JSON IN ERROR (last 500 chars) ===");
          console.log(rawJsonPart.substring(Math.max(0, rawJsonPart.length - 500)));
        }
      }
      throw err;
    }

  } catch (err) {
    console.error("Fatal:", (err as Error).message);
    process.exit(1);
  }

  process.exit(0);
}

extractDoc08();
