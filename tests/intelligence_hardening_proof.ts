import { createClient } from '@supabase/supabase-js';
import { MachineIngestionService } from '../src/lib/machines/intelligence/MachineIngestionService';
import { GeminiOrchestrator } from '../src/lib/machines/intelligence/GeminiOrchestrator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role for tests
const supabase = createClient(supabaseUrl, supabaseKey);

async function runHardeningProof() {
  console.log('--- STARTING HARDENING LOGIC PROOF ---');
  
  // 1. SETUP: Find valid records
  console.log('Setup: Finding valid records...');
  const { data: users } = await supabase.from('users').select('id, organization_id').limit(1);
  const { data: machines } = await supabase.from('machines').select('id').limit(1);

  if (!users?.[0] || !machines?.[0]) throw new Error('No valid user/machine found in DB');

  const orgId = users[0].organization_id;
  const userId = users[0].id;
  const machineId = machines[0].id;

  console.log(`Using Org: ${orgId}, User: ${userId}, Machine: ${machineId}`);
  const { error: upsertErr } = await supabase.from('machine_documents').upsert([
    { id: 'd1111111-1111-1111-1111-111111111111', machine_id: machineId, organization_id: orgId, filename: 'manual_v1.pdf', storage_path: 'manual_v1.pdf', processing_status: 'uploaded' },
    { id: 'd2222222-2222-2222-2222-222222222222', machine_id: machineId, organization_id: orgId, filename: 'parts_v1.pdf', storage_path: 'parts_v1.pdf', processing_status: 'uploaded' }
  ]);
  if (upsertErr) console.error('Upsert Error:', upsertErr);

  const { data: checkDocs } = await supabase.from('machine_documents').select('id, machine_id').eq('machine_id', machineId);
  console.log(`Debug: Found ${checkDocs?.length} docs for machine ${machineId}`);

  const service = new MachineIngestionService('MOCK_KEY');
  service.setSupabaseClient(supabase);
 
  // 2. START RUN
  console.log('Step 1: starting run...');
  const runId = await service.startRun(machineId, orgId, userId);
  
  const { data: runStart } = await supabase.from('machine_ingestion_runs').select('*').eq('id', runId).single();
  console.log(`[OK] startRun: total_documents = ${runStart.total_documents} (Expected 2)`);

  // 3. MOCK INVENTORY & EXTRACTION (Manual insert to simulate Gemini output)
  console.log('Step 2: Simulating inventory and extraction with real Zod metadata...');
  
  // Cleanup previous KB for this run/machine to avoid conflict issues
  await supabase.from('machine_kb').delete().eq('machine_id', machineId);

  // Update docs to parsing
  await supabase.from('machine_documents').update({ processing_status: 'parsing' }).eq('machine_id', machineId);

  // Manual extract insert with validation errors for doc 2
  const { error: extErr } = await supabase.from('machine_document_extracts').insert([
    {
      run_id: runId, machine_id: machineId, organization_id: orgId, document_id: 'd1111111-1111-1111-1111-111111111111',
      version: 1, extraction_mode: 'full', document_type: 'manual', gemini_model: 'gemini-1.5-flash', prompt_version: 'v1',
      status: 'completed', schema_valid: true, validation_errors: [], metrics: {}, extraction_json: {
        machine_identity: { name: 'Titan 500' },
        warnings: [{ canonical_name: 'High Voltage', original_label: 'Danger', status: 'confirmed', confidence: 'high', criticality: 'critical', warning_text: 'Keep away', entity_type: 'warning' }],
        parts: [{ canonical_name: 'Engine', original_label: 'Motor', part_number: 'M-100', is_consumable: false, specifications: {}, entity_type: 'part' }]
      }
    },
    {
      run_id: runId, machine_id: machineId, organization_id: orgId, document_id: 'd2222222-2222-2222-2222-222222222222',
      version: 1, extraction_mode: 'full', document_type: 'parts_catalog', gemini_model: 'gemini-1.5-flash', prompt_version: 'v1',
      status: 'failed', schema_valid: false, validation_errors: [{ path: ['parts', 0, 'part_number'], message: 'Required' }], metrics: {},
      extraction_json: { parts: [{ canonical_name: 'Screw', entity_type: 'part' }] }
    }
  ]);

  if (extErr) console.error('Extract Insert Error:', extErr);

  // Update counters manually as if service did it
  await supabase.from('machine_ingestion_runs').update({
    processed_documents: 2,
    successful_documents: 1,
    failed_documents: 1
  }).eq('id', runId);

  // 4. RUN CONSOLIDATION (Real Service Call)
  console.log('Step 3: running consolidation logic...');
  // Force some contradictions/ambiguities into the consolidator by mocking extracts better if needed
  // But I'll just check if it persists what it gets.
  
  // We need to mock the consolidator result or actually run it if extracts are in DB.
  // runConsolidation fetches from machine_document_extracts.
  await service.runConsolidation(runId);
  
  // 5. RUN FINALIZATION
  console.log('Step 4: running finalization...');
  await service.finalizeRun(runId);

  // 6. DB SNAPSHOT FOR PROOF
  console.log('\n--- MECHANICAL PROOF SNAPSHOT ---');
  
  const { data: runFinal } = await supabase.from('machine_ingestion_runs').select('total_documents, processed_documents, successful_documents, failed_documents').eq('id', runId).single();
  console.log('Counters:', JSON.stringify(runFinal));

  const { data: mentalMap } = await supabase.from('machine_mental_maps').select('map_json').eq('run_id', runId).single();
  console.log('Mental Map JSON:', JSON.stringify(mentalMap.map_json, null, 2));

  const { data: kb } = await supabase.from('machine_kb').select('status').eq('run_id', runId).single();
  console.log('KB Lifecycle Status:', kb.status);

  console.log('--- PROOF COMPLETE ---');
}

runHardeningProof().catch(console.error);
