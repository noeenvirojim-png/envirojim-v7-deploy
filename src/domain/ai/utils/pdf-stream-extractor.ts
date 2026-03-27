import { createAdminClient } from '@/lib/supabase/admin';
const pdf = require('pdf-parse');
import path from 'path';
import fs from 'fs';

/**
 * Downloads a PDF from Supabase Storage and yields blocks of text with page numbers
 * to mimic a stream process and keep memory peaks manageable.
 * Real production stream-parsing should use pdf.js directly
 * internally, but here we process page by page or block by block.
 */
export async function* extractTextStream(storagePath: string): AsyncGenerator<{text: string, pageNumber: number}, void, unknown> {
    const supabase = createAdminClient();

    let buffer: Buffer;
    let usedLocal = false;

    try {
        // Try to download from Supabase Storage
        const { data, error } = await supabase.storage.from('manuals').download(storagePath);

        if (error || !data || (data.size < 100)) {
            throw new Error(error?.message || 'Storage download failed');
        }

        buffer = Buffer.from(await data.arrayBuffer());
    } catch (storageError: any) {
        // Fallback to local for audit/mock environment
        const basePath = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';
        const localPath = `${basePath}\\${storagePath}`;
        console.log(`📂 Trying local fallback at: ${localPath}`);
        if (fs.existsSync(localPath)) {
            console.log(`📂 Using local fallback for: ${storagePath}`);
            buffer = fs.readFileSync(localPath);
            usedLocal = true;
        } else {
            console.log(`❌ Local path not found. Checked: ${localPath}`);
            console.log(`❌ Storage error was: ${storageError.message}`);
            throw new Error('Failed to download from storage and local fallback not found: ' + storagePath);
        }
    }

    console.log(`📦 Processing ${storagePath}: ${buffer.length} bytes`);
    const PDFParseClass = pdf.PDFParse || (pdf.default && pdf.default.PDFParse) || pdf;
    const parser = new PDFParseClass({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();

    // split by common page break markers in pdf-parse output
    const pages = parsed.text.split(/\n\s*\f\s*\n|\n\s*-+ Page \d+ -+\s*\n/i);

    for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i]
            .replace(/\n\s*\n/g, '\n')
            .replace(/[^\x20-\x7E\n]/g, '')
            .trim();

        if (pageText.length > 0) {
            yield { text: pageText, pageNumber: i + 1 };
        }
    }
}
