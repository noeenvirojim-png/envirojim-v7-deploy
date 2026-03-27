import * as pdf from "pdf-parse";
import * as fs from "fs";
import * as path from "path";

// @ts-ignore
const PDFParse = pdf.PDFParse || (pdf.default && pdf.default.PDFParse) || (pdf as any).PDFParse;

async function debug() {
    const pdfPath = path.resolve(__dirname, "../tests/e2e/dummy.pdf");
    if (!fs.existsSync(pdfPath)) {
        console.error("PDF NOT FOUND at", pdfPath);
        return;
    }
    const buffer = fs.readFileSync(pdfPath);
    console.log("FIRST BYTES:", buffer.slice(0, 10).toString());
    const parser = new PDFParse({ data: buffer });
    try {
        const parsed = await parser.getText();
        console.log("TEXT KEYS:", Object.keys(parsed));
        if (parsed.pages) {
            console.log("PAGES COUNT:", parsed.pages.length);
            if (parsed.pages.length > 0) {
                console.log("PAGE 1 OBJ KEYS:", Object.keys(parsed.pages[0]));
            }
        }
        console.log("TEXT PREVIEW:", parsed.text?.slice(0, 50));
    } catch (e) {
        console.log("getText failed:", e.message);
    }
}

debug().catch(console.error);
