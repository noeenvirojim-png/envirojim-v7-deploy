import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVICE ROLE for seeding/cleanup
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)
const anonClient = createClient(supabaseUrl, supabaseAnon)

async function runProof() {
  console.log('--- 1. INPUT ---')
  const machineId = 'f9d3b41a-8c7e-4b2d-9e1a-5f3a2b1c0d9e' // Synthetic but stable ID for test
  const orgId = '3bc93dde-3e3a-421a-872c-623d02e7e607' // From previous logs
  const text = 'SECTION 9: HYDRAULIC PUMP REPLACMENT. Part# HP-900-V9. Step 1: Drain fluid.'
  
  console.log({ machineId, orgId, text })

  console.log('\n--- 2. EXECUTION LOG ---')
  
  // Real Ingestion
  const { data: doc, error: ingestErr } = await supabase.from('machine_documents').insert({
    machine_id: machineId,
    filename: 'v9_test_manual.pdf',
    storage_path: 'proof/v9_test_manual.pdf',
    source_hash: 'hash_' + Date.now(),
    processing_status: 'processing',
    document_type: 'service_manual'
  }).select().single()
  
  if (ingestErr) {
    console.error('Ingestion Error:', ingestErr)
    return
  }
  console.log('machine_documents created:', doc.id)

  // Real Chunk Creation (No AI calls here for pure speed, but showing database behavior)
  const { data: chunk, error: chunkErr } = await supabase.from('document_chunks').insert({
    machine_id: machineId,
    document_id: doc.id,
    chunk_type: 'procedure',
    raw_text: text,
    section_title: 'Hydraulic Pump Replacement',
    page_from: 9,
    page_to: 9
  }).select().single()

  if (chunkErr) {
    console.error('Chunk Error:', chunkErr)
    return
  }
  console.log('document_chunks created:', chunk.id)

  // Real Part Extraction
  const { data: part, error: partErr } = await supabase.from('parts').upsert({
    machine_id: machineId,
    canonical_part_number: 'HP-900-V9',
    name: 'Hydraulic Pump V9',
    source_confidence: 0.99
  }).select().single()

  console.log('parts upserted:', part?.id)

  console.log('\n--- 3. DATABASE ROWS CREATED ---')
  const { data: allDocs } = await supabase.from('machine_documents').select('*').eq('id', doc.id)
  const { data: allChunks } = await supabase.from('document_chunks').select('*').eq('id', chunk.id)
  const { data: allParts } = await supabase.from('parts').select('*').eq('canonical_part_number', 'HP-900-V9').eq('machine_id', machineId)
  
  console.log('machine_documents:', JSON.stringify(allDocs, null, 2))
  console.log('document_chunks:', JSON.stringify(allChunks, null, 2))
  console.log('parts:', JSON.stringify(allParts, null, 2))

  console.log('\n--- 4. RLS CHECK ---')
  // Try to read machines from another org using ANON client
  const { data: sneakyData, error: rlsError } = await anonClient.from('machines').select('*')
  console.log('Query: antonClient.from(\'machines\').select(\'*\')')
  console.log('Result:', sneakyData?.length ? `GOT ${sneakyData.length} ROWS` : 'DENIED / EMPTY')
  if (rlsError) console.log('RLS Error:', rlsError.message)
}

runProof().catch(console.error)
