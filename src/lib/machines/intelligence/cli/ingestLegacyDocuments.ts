import path from 'path';
import crypto from 'crypto';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@/lib/supabase/server';
import { PdfIngestionService } from '../services/PdfIngestionService';
import type { DocType } from '../contracts';

const FAMILY_ID = '21e08969-c319-45ef-af36-088944b3ae72';
const STORAGE_BUCKET = 'machine-documents';

// Map legacy document_type + filename → ai_core doc_type_enum
function mapDocType(legacyType: string, filename: string): DocType {
  const f = filename.toLowerCase();
  if (legacyType === 'parts_catalog') {
    return f.includes('hydraulic') ? 'hydraulic_parts_list' : 'spare_parts_list';
  }
  if (legacyType === 'schematic') return 'electrical_material_list';
  if (legacyType === 'maintenance_manual') return 'maintenance_manual';
  if (legacyType === 'operating_manual') return 'operating_manual';
  // 'other' — refine by filename
  if (f.includes('entretien') || f.includes('maintenance') || f.includes('graissage')) return 'maintenance_manual';
  if (f.includes('dérangement') || f.includes('derangement') || f.includes('solutionnement') || f.includes('fault')) return 'faults_and_remedy';
  if (f.includes('fonctionnement') || f.includes('utilisation') || f.includes('mise en service') || f.includes('instruction')) return 'operating_manual';
  return 'other';
}

async function ingestLegacyDocuments() {
  const publicClient = createClient();
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}`;

  // 1. Find VB750 machines
  const { data: machines } = await publicClient
    .from('machines')
    .select('id, model, manufacturer, brand')
    .or('model.ilike.%VB750%,manufacturer.ilike.%HAMMEL%,brand.ilike.%HAMMEL%');

  if (!machines?.length) { console.log('No VB750 machines found.'); process.exit(1); }
  const machineIds = machines.map(m => m.id);
  console.log(`Found ${machineIds.length} VB750 machine(s)`);

  // 2. Find all documents for these machines
  const { data: docs } = await publicClient
    .from('machine_documents')
    .select('id, filename, document_type, storage_path, source_hash')
    .in('machine_id', machineIds);

  if (!docs?.length) { console.log('No documents found.'); process.exit(1); }
  console.log(`Found ${docs.length} document(s) to ingest`);

  const ingestionService = new PdfIngestionService();
  let ok = 0, skip = 0, fail = 0;

  for (const doc of docs) {
    const docType = mapDocType(doc.document_type ?? 'other', doc.filename);
    try {
      // Download PDF
      const url = `${storageBase}/${doc.storage_path}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${svcKey}` } });
      if (!res.ok) { console.log(`  SKIP ${doc.filename} — storage ${res.status}`); skip++; continue; }

      const buffer = Buffer.from(await res.arrayBuffer());
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const docKey = doc.id; // use legacy doc id as unique key

      await ingestionService.ingest({
        family_id: FAMILY_ID,
        doc_key: docKey,
        title: doc.filename.replace(/\.pdf$/i, ''),
        doc_type: docType,
        language_code: 'fr',
        source_filename: doc.filename,
        file_sha256: sha256,
        storage_path: doc.storage_path,
        file_buffer: buffer,
      });

      console.log(`  OK  ${doc.filename} (${docType})`);
      ok++;
    } catch (e: any) {
      if (e.message?.includes('already exists')) { console.log(`  DUP ${doc.filename}`); skip++; }
      else { console.log(`  ERR ${doc.filename}: ${e.message}`); fail++; }
    }
  }

  console.log(`\nDone: ${ok} ingested, ${skip} skipped/dup, ${fail} failed`);
}

ingestLegacyDocuments().catch(e => { console.error(e); process.exit(1); });
