import * as fs from "fs";
import * as path from "path";

const DEFAULT_PDF_PATH = "C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service\\12 VB750DK -1208 Assemblies and Spare Parts, Baugruppen und Ersatzteile 2024-04-18.pdf";
const PDF_PATH = process.argv[2] || process.env.PDF_PATH || DEFAULT_PDF_PATH;

async function main() {
  const result: Record<string, unknown> = {
    pdf_path: PDF_PATH,
    file_exists: false,
    file_size: 0,
    header_ok: false,
    parser_ok: false,
    page_count: 0,
    text_char_count: 0,
    first_1000_chars: "",
    raw_error: null,
  };

  try {
    // Check file exists
    if (!fs.existsSync(PDF_PATH)) {
      result.raw_error = "FILE_NOT_FOUND";
      write(result);
      return;
    }
    result.file_exists = true;

    const buf = fs.readFileSync(PDF_PATH);
    result.file_size = buf.length;

    // Check PDF header
    const header = buf.subarray(0, 5).toString("ascii");
    result.header_ok = header === "%PDF-";

    if (!result.header_ok) {
      result.raw_error = `BAD_HEADER: ${header}`;
      write(result);
      return;
    }

    // Use pipeline's parser: pdf-parse v2 PDFParse class
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const textResult = await parser.getText();
    await parser.destroy();

    const pages = textResult.pages as Array<{ num: number; text: string }>;
    result.page_count = pages.length;

    const allText = pages.map((p) => p.text).join("\n");
    result.text_char_count = allText.length;
    result.first_1000_chars = allText.slice(0, 1000);
    result.parser_ok = true;
  } catch (e: any) {
    result.raw_error = e?.message ?? String(e);
  }

  write(result);
}

function write(data: Record<string, unknown>) {
  const outDir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "pdf_input_proof.json");
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Written: ${outPath}`);
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
