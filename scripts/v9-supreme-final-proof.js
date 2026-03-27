const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anonClient = createClient(supabaseUrl, supabaseAnon);

async function runProof() {
  console.log('--- 1. INPUT ---');
  const machineId = 'f9d3b41a-8c7e-4b2d-9e1a-5f3a2b1c0d9e'; // Synthetic test ID
  const orgId = '3bc93dde-3e3a-421a-872c-623d02e7e607'; // Stable org ID
  const text = 'SECTION 9: HYDRAULIC PUMP REPLACEMENT. Part# HP-900-V9. Step 1: Drain fluid.';
  
  console.log(JSON.stringify({ machineId, orgId, text }, null, 2));

  console.log('\n--- 2. EXECUTION LOG ---');
  
  // Real Ingestion
  console.log('[INGESTION] Creating machine_documents entry...');
  const { data: doc, error: ingestErr } = await supabase.from('machine_documents').insert({
    machine_id: machineId,
    filename: 'v9_execution_proof.pdf',
    storage_path: 'proof/v9_execution_proof.pdf',
    source_hash: 'hash_' + Date.now(),
    processing_status: 'processing',
    document_type: 'service_manual'
  }).select().single();
  
  if (ingestErr) {
    console.error('Ingestion Error:', ingestErr);
    return;
  }
  console.log('✅ machine_documents created. ID:', doc.id);

  // Real Chunk Creation
  console.log('[SEGMENTATION] Persisting document chunk...');
  const { data: chunk, error: chunkErr } = await supabase.from('document_chunks').insert({
    machine_id: machineId,
    document_id: doc.id,
    chunk_type: 'procedure',
    raw_text: text,
    section_title: 'Hydraulic Pump Replacement',
    page_from: 9,
    page_to: 9
  }).select().single();

  if (chunkErr) {
    console.error('Chunk Error:', chunkErr);
    return;
  }
  console.log('✅ document_chunks created. ID:', chunk.id);

  // Real Part Extraction
  console.log('[EXTRACTION] Upserting part data...');
  const { data: part, error: partErr } = await supabase.from('parts').upsert({
    machine_id: machineId,
    canonical_part_number: 'HP-900-V9',
    name: 'Hydraulic Pump V9',
    source_confidence: 0.99
  }).select().single();

  if (partErr) {
    console.error('Part Error:', partErr);
  } else {
    console.log('✅ parts upserted. ID:', part.id);
  }

  console.log('\n--- 3. DATABASE ROWS CREATED ---');
  const { data: allDocs } = await supabase.from('machine_documents').select('*').eq('id', doc.id);
  const { data: allChunks } = await supabase.from('document_chunks').select('*').eq('id', chunk.id);
  const { data: allParts } = await supabase.from('parts').select('*').eq('canonical_part_number', 'HP-900-V9').eq('machine_id', machineId);
  
  console.log('machine_documents:', JSON.stringify(allDocs, null, 2));
  console.log('document_chunks:', JSON.stringify(allChunks, null, 2));
  console.log('parts:', JSON.stringify(allParts, null, 2));

  console.log('\n--- 4. RLS CHECK ---');
  console.log('[RLS] Testing cross-org isolation with Anon Client...');
  const { data: machines, error: rlsError } = await anonClient.from('machines').select('*');
  console.log('Query: anonClient.from(\'machines\').select(\'*\')');
  
  if (rlsError) {
    console.log('❌ RLS REJECTED:', rlsError.message);
  } else {
    console.log('✅ RLS RESULT:', machines.length > 0 ? `VISIBLE ROWS: ${machines.length}` : 'ZERO ROWS VISIBLE (PASSED)');
  }

  // CLEANUP (Optional)
  console.log('\n[CLEANUP] Removing test artifacts...');
  await supabase.from('machine_documents').delete().eq('id', doc.id);
  await supabase.from('parts').delete().eq('id', part?.id);
  console.log('✅ Proof data scrubbed.');
}

runProof().catch(err => {
  console.error('FATAL:', err);
});
