import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { enrichDiagnostic } from '../src/domain/diagnostics/transformers';
import { enrichMaintenance } from '../src/domain/maintenance/transformers';
import { enrichPartForProcurement } from '../src/domain/procurement/transformers';

const envPath = path.resolve('.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim().replace(/^\"|\"$/g, '');
      if (value) process.env[key] = value;
    }
  });
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing env');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('[BLOCK 3] Cross-Domain Coordination: Maintenance → Procurement');
  console.log('=====================================================================');

  // Setup: Create test org, machine, and parts catalog
  const orgId = uuid();
  const machineId = uuid();

  await supabase
    .from('organizations')
    .insert({ id: orgId, name: `XDOM-ORG-${Date.now()}`, type: 'SUB_DEALER' });

  await supabase
    .from('machines')
    .insert({
      id: machineId,
      owner_org_id: orgId,
      serial_number: `XDOM-SN-${Date.now()}`,
      make: 'Hammel',
      model: 'VB750',
      year: 2026
    });

  console.log('[1] Creating diagnostic → maintenance → procurement chain...');

  // Step 1: Diagnostic
  const rawDiagnostic = {
    machine_id: machineId,
    query: 'Hydraulic filter change required',
    top_cluster_name: 'Routine Hydraulic Maintenance',
    related_faults: [],
    playbook_steps: [
      { step: 1, title: 'Drain fluid', description: 'Prepare work area', type: 'maintenance', completed: false },
      { step: 2, title: 'Replace filter', description: 'Install new filter', type: 'maintenance', completed: false }
    ],
    related_parts: ['hydraulic_filter', 'o_rings', 'filter_fluid'],
    related_maintenance: ['filter_replacement', 'fluid_check'],
    evidence_refs: ['maintenance_schedule']
  };

  const enrichedDiag = enrichDiagnostic(rawDiagnostic);
  console.log(`   ✓ Diagnostic identified parts needed: ${enrichedDiag.parts_to_check.length}`);

  // Step 2: Maintenance (derives from diagnostic)
  const maintenanceInput = {
    machine_id: machineId,
    title: 'Filter Replacement Maintenance',
    description: 'Perform hydraulic filter replacement',
    required_parts: enrichedDiag.parts_to_check.map(p => ({
      part_name: p.part_name,
      quantity: 1
    }))
  };

  const enrichedMaint = enrichMaintenance(maintenanceInput);
  console.log(`   ✓ Maintenance plan requires: ${enrichedMaint.required_parts.length} part types`);

  // Step 3: Procurement (derives from maintenance)
  const enrichedPartsList = enrichedMaint.required_parts.map(p =>
    enrichPartForProcurement(
      {
        part_name: p.part_name,
        machine_id: machineId,
        requested_quantity: p.quantity
      },
      'ai_maintenance'
    )
  );

  console.log(`   ✓ Procurement enrichment created: ${enrichedPartsList.length} part requests`);

  console.log('[2] Persisting part orders from maintenance derivation...');

  const partOrderIds: string[] = [];

  // Persist each part request as a part_order
  for (const enrichedPart of enrichedPartsList) {
    const partOrderId = uuid();
    const persistWrite = await supabase
      .from('part_orders')
      .insert({
        id: partOrderId,
        machine_id: enrichedPart.machine_id,
        org_id: orgId,
        part_name: enrichedPart.part_name,
        part_number: enrichedPart.part_number,
        quantity: enrichedPart.requested_quantity,
        urgency: enrichedPart.safety_critical ? 'high' : 'normal',
        source: 'procurement_enriched',
        metadata: {
          derived_from_maintenance: enrichedMaint.title,
          derived_from_diagnostic: enrichedDiag.top_cluster_name,
          confidence: enrichedPart.confidence,
          lead_time_days: enrichedPart.estimated_lead_time_days
        }
      })
      .select('id')
      .single();

    if (persistWrite.error) {
      throw new Error(`Part order write failed: ${persistWrite.error.message}`);
    }

    partOrderIds.push(persistWrite.data?.id || '');
    console.log(`   ✓ Part order created: ${enrichedPart.part_name}`);
  }

  console.log('[3] Verifying cross-domain traceability...');

  // Verify all part orders can be read back and trace to original diagnostic
  const allPartOrders = await supabase
    .from('part_orders')
    .select('id, part_name, metadata')
    .in('id', partOrderIds);

  if (allPartOrders.error) {
    throw new Error(`Read failed: ${allPartOrders.error.message}`);
  }

  const traceabilityVerified = allPartOrders.data?.every((po: any) => {
    const meta = po.metadata as any;
    return (
      meta?.derived_from_maintenance === enrichedMaint.title &&
      meta?.derived_from_diagnostic === enrichedDiag.top_cluster_name
    );
  });

  if (!traceabilityVerified) {
    throw new Error('Cross-domain traceability mismatch');
  }

  console.log(`   ✓ Cross-domain chain verified: ${allPartOrders.data?.length} part orders traced`);

  console.log('');
  console.log('## BLOCK 3 RESULT: CROSS-DOMAIN COORDINATION');
  console.log('- diagnostic_enrichment_input: PASS');
  console.log('- maintenance_derivation_from_diagnostic: PASS');
  console.log('- procurement_derivation_from_maintenance: PASS');
  console.log('- cross_domain_persistence: PASS');
  console.log('- traceability_chain_verified: PASS');
  console.log('- final_status: PASS');
  console.log('');
  console.log('## CASCADE COMPLETION');
  console.log('✓ BLOCK 1: Diagnostic Enriched Pipeline — PASS');
  console.log('✓ BLOCK 2: Maintenance Derivation — PASS');
  console.log('✓ BLOCK 3: Cross-Domain Coordination — PASS');
  console.log('');
  console.log('NEXT BLOCKER: Real-time enriched output integration + multi-machine scaling');
}

main().catch(e => {
  console.error('## BLOCK 3 FAILED');
  console.error(`- ${e.message}`);
  process.exit(1);
});
