import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { enrichDiagnostic } from '../src/domain/diagnostics/transformers';
import { enrichMaintenance } from '../src/domain/maintenance/transformers';

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

  console.log('[BLOCK 2] Enriched Maintenance Derivation');
  console.log('========================================');

  // Setup: Create test org and machine
  const orgId = uuid();
  const machineId = uuid();

  await supabase
    .from('organizations')
    .insert({ id: orgId, name: `MAINT-ORG-${Date.now()}`, type: 'SUB_DEALER' });

  await supabase
    .from('machines')
    .insert({
      id: machineId,
      owner_org_id: orgId,
      serial_number: `MAINT-SN-${Date.now()}`,
      make: 'Hammel',
      model: 'VB750',
      year: 2026
    });

  console.log('[1] Creating diagnostic enriched input...');
  const rawDiagnostic = {
    machine_id: machineId,
    query: 'Hydraulic system degradation',
    top_cluster_name: 'High Hydraulic System Maintenance',
    related_faults: ['low_pressure', 'noise_in_pump'],
    playbook_steps: [
      { step: 1, title: 'Check fluid', description: 'Inspect level', type: 'inspection', completed: false },
      { step: 2, title: 'Replace filter', description: 'Change hydraulic filter', type: 'maintenance', completed: false }
    ],
    related_parts: ['hydraulic_filter', 'fluid_additive'],
    related_maintenance: ['filter_change', 'fluid_analysis', 'pump_inspection'],
    evidence_refs: ['manual_ch5']
  };

  const enrichedDiag = enrichDiagnostic(rawDiagnostic);
  console.log(`   ✓ Diagnostic severity: ${enrichedDiag.severity}`);
  console.log(`   ✓ Recommended actions: ${enrichedDiag.recommended_actions.length}`);

  console.log('[2] Deriving maintenance tasks from diagnostic...');
  // Transform diagnostic recommended_actions into maintenance enrichment
  const maintenanceInput = {
    machine_id: machineId,
    title: `Maintenance: ${enrichedDiag.top_cluster_name}`,
    description: `Follow-up maintenance from diagnostic: ${enrichedDiag.evidence_summary}`,
    severity: enrichedDiag.severity,
    likely_systems: enrichedDiag.likely_systems,
    recommended_actions: enrichedDiag.recommended_actions,
    safety_critical: enrichedDiag.safety_level !== 'safe' && enrichedDiag.safety_level !== 'caution',
    estimated_duration_minutes: enrichedDiag.recommended_actions.reduce((sum, a) => sum + a.estimated_duration_minutes, 0) || 60
  };

  const enrichedMaint = enrichMaintenance(maintenanceInput);
  console.log(`   ✓ Maintenance priority: ${enrichedMaint.priority}`);
  console.log(`   ✓ Maintenance type: ${enrichedMaint.maintenance_type}`);
  console.log(`   ✓ Checklist steps: ${enrichedMaint.checklist_steps?.length || 0}`);

  console.log('[3] Persisting enriched maintenance as work_order...');
  const workOrderId = uuid();
  const persistWrite = await supabase
    .from('work_orders')
    .insert({
      id: workOrderId,
      machine_id: enrichedMaint.machine_id,
      title: enrichedMaint.title || 'Maintenance Task',
      description: enrichedMaint.description || '',
      priority: enrichedMaint.priority || 'medium',
      status: 'OPEN',
      estimated_hours: Math.ceil((enrichedMaint.estimated_duration_minutes || 60) / 60),
      source: 'maintenance_enriched',
      metadata: {
        from_diagnostic: enrichedDiag.top_cluster_name,
        maintenance_type: enrichedMaint.maintenance_type,
        required_tools: enrichedMaint.required_tools,
        checklist_steps: enrichedMaint.checklist_steps,
        preconditions: enrichedMaint.preconditions
      }
    })
    .select('id')
    .single();

  if (persistWrite.error) {
    throw new Error(`Work order write failed: ${persistWrite.error.message}`);
  }

  console.log(`   ✓ Persisted to work_orders: ${persistWrite.data?.id}`);

  console.log('[4] Verifying work_order can be read back...');
  const readBack = await supabase
    .from('work_orders')
    .select('id, title, priority, status, metadata')
    .eq('id', workOrderId)
    .single();

  if (readBack.error) {
    throw new Error(`Read failed: ${readBack.error.message}`);
  }

  const metadata = readBack.data?.metadata as any;
  const verifyDerivation =
    metadata?.from_diagnostic === enrichedDiag.top_cluster_name &&
    metadata?.maintenance_type === enrichedMaint.maintenance_type;

  if (!verifyDerivation) {
    throw new Error('Derived maintenance data mismatch');
  }

  console.log('   ✓ Maintenance derivation verified');

  console.log('');
  console.log('## BLOCK 2 RESULT: MAINTENANCE DERIVATION FROM DIAGNOSTIC');
  console.log('- diagnostic_enrichment_input: PASS');
  console.log('- maintenance_transformation_from_diagnostic: PASS');
  console.log('- work_order_persistence: PASS');
  console.log('- cross_domain_derivation_verified: PASS');
  console.log('- final_status: PASS');
}

main().catch(e => {
  console.error('## BLOCK 2 FAILED');
  console.error(`- ${e.message}`);
  process.exit(1);
});
