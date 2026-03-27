import { createClient } from './src/lib/supabase/server';
import { PdfIngestionService } from './src/domain/machines/intelligence/services/PdfIngestionService';
import fs from 'fs';
import path from 'path';

const MACHINE_ID = 'd6da048e-11a1-40ae-a61f-18f81614137e'; // VB750
const ORG_ID = '550e8400-e29b-41d4-a716-446655440000'; // From schema
const PDF_PATH = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service\\08 VB750DK-m2021 EU V Instructions d\'entretien V401.pdf';

async function testIngest() {
  console.log('Starting PDF ingestion test...');
  console.log(`PDF: ${path.basename(PDF_PATH)}`);
  console.log(`Machine: ${MACHINE_ID}`);

  const supabase = createClient();
  const service = new PdfIngestionService(supabase, ORG_ID);

  try {
    // Read PDF file
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);

    // Ingest
    const result = await service.ingestPdfDocument({
      machineId: MACHINE_ID,
      filename: path.basename(PDF_PATH),
      buffer: pdfBuffer,
      contentType: 'application/pdf'
    });

    console.log('\n=== INGESTION RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    // Check DB results
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('source_filename', path.basename(PDF_PATH))
      .single();

    console.log('\n=== DOCUMENT IN DB ===');
    console.log(JSON.stringify(doc, null, 2));

    const { data: entities } = await supabase
      .from('entities')
      .select('*')
      .eq('document_id', doc.id)
      .limit(5);

    console.log('\n=== ENTITIES CREATED ===');
    console.log(`Count: ${entities?.length || 0}`);
    entities?.forEach((e: any) => {
      console.log(`  - ${e.type}: ${e.label} (page ${e.page_number})`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testIngest();
