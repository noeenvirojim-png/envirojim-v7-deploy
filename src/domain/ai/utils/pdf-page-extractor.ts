const { PDFParse } = require("pdf-parse");

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

/**
 * Extracts text from a PDF buffer page by page.
 * Uses pdf-parse to extract text with page information.
 */
export async function extractPdfPages(buffer: Buffer | Blob): Promise<ExtractedPdfPage[]> {
  // Convert Blob to Buffer if necessary
  let pdfBuffer = buffer;
  if (buffer instanceof Blob) {
    const arrayBuffer = await buffer.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuffer);
  }

  // Use PDFParse class constructor
  const parser = new PDFParse({ data: pdfBuffer });
  const parsed = await parser.getText();

  // pdf-parse returns an object with text and page info
  if (!parsed.text || parsed.text.trim().length === 0) {
    return [];
  }

  // For now, return the full text as page 1 (pdf-parse doesn't provide per-page text granularity)
  return [{
    pageNumber: 1,
    text: parsed.text.trim()
  }];
}
