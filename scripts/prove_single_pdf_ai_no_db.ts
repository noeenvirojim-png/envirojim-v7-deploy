/**
 * prove_single_pdf_ai_no_db.ts — Read 1 real PDF, send text to Gemini, zero DB writes.
 * Writes artifacts/single_pdf_ai_proof.json.
 */
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';
// pdf-parse v3 uses PDFParse class
const pdfParseMod = require('pdf-parse');
const { PDFParse } = pdfParseMod;

const MODEL = 'gemini-2.5-flash';
const PDF_PATH = path.resolve(process.cwd(), 'scripts/valid-test.pdf');

async function main() {
  const result: Record<string, unknown> = {
    pdf_path: PDF_PATH,
    extraction_ok: false,
    extracted_char_count: 0,
    model_used: MODEL,
    ai_call_ok: false,
    response_excerpt: null,
    raw_error: null,
  };

  // Step 1: Extract text from PDF
  let text = '';
  try {
    const buffer = fs.readFileSync(PDF_PATH);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    text = (parsed.text || '').trim();
    result.extraction_ok = text.length > 0;
    result.extracted_char_count = text.length;
    console.log(`PDF text extracted: ${text.length} chars`);
    if (text.length > 0) {
      console.log(`  Preview: ${text.slice(0, 200)}`);
    }
  } catch (e: any) {
    result.raw_error = `PDF extraction failed: ${e.message}`;
    console.error(result.raw_error);
    fs.writeFileSync(
      path.resolve(process.cwd(), 'artifacts/single_pdf_ai_proof.json'),
      JSON.stringify(result, null, 2),
    );
    process.exit(1);
  }

  if (!text) {
    result.raw_error = 'PDF had no extractable text';
    console.error(result.raw_error);
    fs.writeFileSync(
      path.resolve(process.cwd(), 'artifacts/single_pdf_ai_proof.json'),
      JSON.stringify(result, null, 2),
    );
    process.exit(1);
  }

  // Step 2: Send to Gemini — same pattern as geminiClient.ts
  try {
    const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = ai.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Extract a short summary from this document text. Return JSON: {"summary":"...","word_count":N}\n\nDocument:\n${text.slice(0, 2000)}`;

    const res = await model.generateContent(prompt);
    const responseText = res.response.text().trim();
    console.log(`\nGemini response: ${responseText.slice(0, 300)}`);

    result.ai_call_ok = true;
    result.response_excerpt = responseText.slice(0, 500);
  } catch (e: any) {
    result.raw_error = e.message?.slice(0, 300) ?? String(e);
    console.error(`Gemini call failed: ${result.raw_error}`);
  }

  const outPath = path.resolve(process.cwd(), 'artifacts/single_pdf_ai_proof.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nWrote: ${outPath}`);
  console.log(`AI_CALL_OK: ${result.ai_call_ok}`);

  if (!result.ai_call_ok) process.exit(1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
