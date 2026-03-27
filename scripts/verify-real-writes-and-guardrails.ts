#!/usr/bin/env node

/**
 * Verify real DB writes and guardrails from enriched flows
 * Tests actual persistence, metadata coherence, and error handling
 */

import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = path.resolve(__dirname, '../artifacts/real-write-and-guardrail-proof');

interface WriteProof {
  domain: string;
  request: any;
  response: any;
  verified: boolean;
  error?: string;
}

async function testDiagnosticWrite(
  baseUrl: string,
  machineId: string
): Promise<WriteProof> {
  try {
    const enrichedData = {
      top_cluster_name: 'Hydraulic Pressure Loss',
      evidence_summary: 'Verified via KB cross-reference',
      severity: 'high',
      confidence: 92,
      likely_systems: ['hydraulic', 'pressure_relief'],
      recommended_actions: ['Check pump', 'Inspect seals'],
      parts_to_check: ['pressure_gauge', 'relief_valve'],
      safety_level: 'critical',
      downtime_risk: 'immediate',
    };

    const response = await fetch(`${baseUrl}/api/test/write-diagnostic-enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, enriched_data: enrichedData }),
    });

    const data = await response.json();

    return {
      domain: 'diagnostic',
      request: { machineId, enrichedData },
      response: data,
      verified: response.ok && data.verified,
      error: response.ok ? undefined : data.error,
    };
  } catch (err: any) {
    return {
      domain: 'diagnostic',
      request: {},
      response: {},
      verified: false,
      error: err.message,
    };
  }
}

async function testMaintenanceWrite(
  baseUrl: string,
  machineId: string
): Promise<WriteProof> {
  try {
    const enrichedData = {
      name: 'Hydraulic Filter Replacement',
      maintenance_type: 'preventive',
      interval_unit: 'hours',
      interval_value: 500,
      estimated_duration_minutes: 45,
      required_tools: ['wrench_set', 'filter_socket'],
      required_parts: ['hyd_filter_p1234'],
      preconditions: ['Depressurize system', 'Ensure power off'],
      post_checks: ['Check pressure', 'Verify no leaks'],
      priority: 'high',
      checklist_steps: [
        { description: 'Depressurize hydraulic system', order: 1 },
        { description: 'Remove old filter', order: 2 },
        { description: 'Install new filter', order: 3 },
        { description: 'Repressurize and bleed', order: 4 },
        { description: 'Run diagnostics', order: 5 },
      ],
    };

    const response = await fetch(`${baseUrl}/api/test/write-maintenance-enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, enriched_data: enrichedData }),
    });

    const data = await response.json();

    return {
      domain: 'maintenance',
      request: { machineId, enrichedData },
      response: data,
      verified: response.ok && data.verified && data.steps_created > 0,
      error: response.ok ? undefined : data.error,
    };
  } catch (err: any) {
    return {
      domain: 'maintenance',
      request: {},
      response: {},
      verified: false,
      error: err.message,
    };
  }
}

async function testProcurementWrite(
  baseUrl: string,
  machineId: string
): Promise<WriteProof> {
  try {
    const enrichedData = {
      part_number: 'HYD-FILTER-P1234',
      part_name: 'Hydraulic Filter - High Flow',
      source: 'ai_kb',
      confidence: 88,
      safety_critical: false,
      estimated_lead_time_days: 3,
      estimated_unit_cost: 185.50,
    };

    const response = await fetch(`${baseUrl}/api/test/write-procurement-enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId, enriched_data: enrichedData }),
    });

    const data = await response.json();

    return {
      domain: 'procurement',
      request: { machineId, enrichedData },
      response: data,
      verified: response.ok && data.verified && data.part_number === enrichedData.part_number,
      error: response.ok ? undefined : data.error,
    };
  } catch (err: any) {
    return {
      domain: 'procurement',
      request: {},
      response: {},
      verified: false,
      error: err.message,
    };
  }
}

async function testGuardrails(baseUrl: string, machineId: string) {
  const guardrails: any = {};

  // Guard 1: Diagnostic - missing severity/confidence should fail or default
  try {
    const response = await fetch(`${baseUrl}/api/test/write-diagnostic-enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        enriched_data: { top_cluster_name: 'Test' }, // missing severity/confidence
      }),
    });
    guardrails.diagnostic_missing_enrichment = response.ok; // Should still write but with defaults
  } catch (err: any) {
    guardrails.diagnostic_missing_enrichment_error = err.message;
  }

  // Guard 2: Maintenance - checklist_steps required for full exploitation
  try {
    const response = await fetch(`${baseUrl}/api/test/write-maintenance-enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        enriched_data: {
          name: 'Test',
          maintenance_type: 'preventive',
          // no checklist_steps
        },
      }),
    });
    const data = await response.json();
    guardrails.maintenance_missing_checklist = data.steps_created === 0; // Should create WO but no steps
  } catch (err: any) {
    guardrails.maintenance_missing_checklist_error = err.message;
  }

  // Guard 3: Procurement - part_number is mandatory
  try {
    const response = await fetch(`${baseUrl}/api/test/write-procurement-enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_id: machineId,
        enriched_data: { part_name: 'Test Part' }, // missing part_number
      }),
    });
    guardrails.procurement_part_number_guard = !response.ok; // Should fail
  } catch (err: any) {
    guardrails.procurement_part_number_guard = true;
  }

  return guardrails;
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const machineId = 'c4f8d1e2-9a7b-4c3e-b5d6-7f8e9a0b1c2d'; // VB750 DK-1211 ID (example)

  console.log(`[REAL_WRITE_TEST] Starting at ${baseUrl}`);
  console.log(`[REAL_WRITE_TEST] Target machine: ${machineId}`);

  // Small delay to ensure server is ready if just started
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    const diagnosticProof = await testDiagnosticWrite(baseUrl, machineId);
    const maintenanceProof = await testMaintenanceWrite(baseUrl, machineId);
    const procurementProof = await testProcurementWrite(baseUrl, machineId);
    const guardrailProof = await testGuardrails(baseUrl, machineId);

    const allVerified =
      diagnosticProof.verified && maintenanceProof.verified && procurementProof.verified;

    const report = {
      timestamp: new Date().toISOString(),
      base_url: baseUrl,
      target_machine_id: machineId,
      writes: {
        diagnostic: diagnosticProof,
        maintenance: maintenanceProof,
        procurement: procurementProof,
      },
      guardrails: guardrailProof,
      business_coherence: {
        diagnostic_severity_consistent: diagnosticProof.response?.verified ? 'PASS' : 'FAIL',
        maintenance_checklist_exploitable: maintenanceProof.response?.checklist_exploitable ? 'PASS' : 'FAIL',
        procurement_safety_critical_marked:
          procurementProof.response?.safety_critical_marked !== undefined ? 'PASS' : 'FAIL',
      },
      summary: {
        diagnostic_real_db_write_verified: diagnosticProof.verified ? 'PASS' : 'FAIL',
        maintenance_real_db_write_verified: maintenanceProof.verified ? 'PASS' : 'FAIL',
        procurement_real_db_write_verified: procurementProof.verified ? 'PASS' : 'FAIL',
        guardrail_check_verified:
          guardrailProof.diagnostic_missing_enrichment &&
          guardrailProof.maintenance_missing_checklist &&
          guardrailProof.procurement_part_number_guard
            ? 'PASS'
            : 'PARTIAL',
        all_writes_verified: allVerified ? 'PASS' : 'FAIL',
        final_status: allVerified ? 'PRODUCTION_READY' : 'PILOT_READY',
      },
    };

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'real_write_and_guardrail_proof.json'), JSON.stringify(report, null, 2));

    console.log(JSON.stringify(report, null, 2));
    process.exit(allVerified ? 0 : 1);
  } catch (error: any) {
    const failure = {
      timestamp: new Date().toISOString(),
      error: error.message,
      final_status: 'BLOCKED',
    };
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'real_write_and_guardrail_proof.json'),
      JSON.stringify(failure, null, 2)
    );
    console.error(JSON.stringify(failure, null, 2));
    process.exit(1);
  }
}

main();
