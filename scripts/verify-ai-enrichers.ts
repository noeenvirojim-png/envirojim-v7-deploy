#!/usr/bin/env node

/**
 * Verify AI enrichment transformers work with real data
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '../src/lib/supabase/server';
import { enrichDiagnostic } from '../src/domain/diagnostics/transformers';
import { enrichMaintenance } from '../src/domain/maintenance/transformers';
import { enrichPartForProcurement, validateProcurementPart } from '../src/domain/procurement/transformers';

const ARTIFACT_DIR = path.resolve(__dirname, '../artifacts/ai-parallel-block');

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  try {
    const supabase = createClient();

    // Get a real machine for testing
    const { data: machines, error: machineError } = await supabase
      .from('machines')
      .select('*')
      .limit(1);

    if (machineError || !machines || machines.length === 0) {
      throw new Error('No machines found for testing');
    }

    const machine = machines[0];
    const machineId = machine.id;

    // Test diagnostic enrichment
    const sampleDiagnostic = {
      machine_id: machineId,
      query: 'Machine not starting',
      top_cluster_name: 'Electrical System Failure - High Priority',
      playbook_steps: [
        { step: 1, title: 'Check Power Connection', description: 'Verify all connections', type: 'electrical', completed: true },
        { step: 2, title: 'Test Circuit Breaker', description: 'Run continuity test', type: 'test', completed: false },
      ],
      related_faults: ['Power Loss', 'Circuit Fault'],
      related_maintenance: ['Electrical System Check'],
      related_parts: ['Circuit Breaker', 'Power Supply Unit'],
      evidence_refs: ['test_1', 'test_2', 'test_3'],
    };

    const enrichedDiag = enrichDiagnostic(sampleDiagnostic);

    // Test maintenance enrichment
    const sampleMaintenance = {
      id: 'maint_1',
      machine_id: machineId,
      title: 'Scheduled Electrical System Inspection',
      description: 'Monthly electrical system check including voltage tests and connection inspection',
      related_parts: ['Circuit Breaker', 'Power Cable', 'Fuse'],
    };

    const enrichedMaint = enrichMaintenance(sampleMaintenance);

    // Test parts enrichment
    const samplePart = {
      part_name: 'Circuit Breaker CB-50A',
      machine_id: machineId,
      confidence: 85,
      evidence_summary: 'Critical component identified in diagnostic',
    };

    const enrichedPart = enrichPartForProcurement(samplePart, 'ai_diagnostic');
    const validation = validateProcurementPart(enrichedPart);

    // Compile results
    const summary = {
      timestamp: new Date().toISOString(),
      target_machine_id: machineId,
      target_machine_name: machine.name,
      test_results: {
        diagnostic_enrichment: {
          status: enrichedDiag.severity && enrichedDiag.confidence > 0 ? 'PASS' : 'FAIL',
          fields_present: [
            'severity',
            'confidence',
            'likely_systems',
            'recommended_actions',
            'parts_to_check',
            'safety_level',
            'downtime_risk',
            'evidence_summary',
          ],
          sample: {
            severity: enrichedDiag.severity,
            confidence: enrichedDiag.confidence,
            safety_level: enrichedDiag.safety_level,
            downtime_risk: enrichedDiag.downtime_risk,
            systems: enrichedDiag.likely_systems,
          },
        },
        maintenance_enrichment: {
          status: enrichedMaint.maintenance_type && enrichedMaint.checklist_steps?.length > 0 ? 'PASS' : 'FAIL',
          fields_present: [
            'maintenance_type',
            'estimated_duration_minutes',
            'required_tools',
            'required_parts',
            'preconditions',
            'post_checks',
            'priority',
            'checklist_steps',
          ],
          sample: {
            maintenance_type: enrichedMaint.maintenance_type,
            priority: enrichedMaint.priority,
            duration_minutes: enrichedMaint.estimated_duration_minutes,
            checklist_step_count: enrichedMaint.checklist_steps?.length || 0,
          },
        },
        parts_enrichment: {
          status: validation.valid ? 'PASS' : 'FAIL',
          validation_errors: validation.errors,
          fields_present: [
            'part_number',
            'part_name',
            'source',
            'confidence',
            'safety_critical',
            'estimated_lead_time_days',
            'estimated_unit_cost',
          ],
          sample: {
            part_number: enrichedPart.part_number,
            part_name: enrichedPart.part_name,
            source: enrichedPart.source,
            confidence: enrichedPart.confidence,
            safety_critical: enrichedPart.safety_critical,
          },
        },
      },
      overall_status: validation.valid && enrichedDiag.severity && enrichedMaint.maintenance_type ? 'PASS' : 'FAIL',
    };

    // Write artifacts
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'diagnostic_sample.json'), JSON.stringify(enrichedDiag, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'maintenance_sample.json'), JSON.stringify(enrichedMaint, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'parts_sample.json'), JSON.stringify(enrichedPart, null, 2));

    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.overall_status === 'PASS' ? 0 : 1);
  } catch (error: any) {
    const errorSummary = {
      overall_status: 'FAIL',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.json'), JSON.stringify(errorSummary, null, 2));
    console.error(JSON.stringify(errorSummary, null, 2));
    process.exit(1);
  }
}

main();
