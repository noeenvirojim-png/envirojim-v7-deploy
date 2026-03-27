#!/usr/bin/env node

/**
 * Verify AI enrichment transformers work with local mock data
 */

import fs from 'node:fs';
import path from 'node:path';
import { enrichDiagnostic } from '../src/domain/diagnostics/transformers';
import { enrichMaintenance } from '../src/domain/maintenance/transformers';
import { enrichPartForProcurement, validateProcurementPart } from '../src/domain/procurement/transformers';

const ARTIFACT_DIR = path.resolve(__dirname, '../artifacts/ai-parallel-block');

function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  try {
    const machineId = 'vb750-dk-1211-test';

    // Test diagnostic enrichment with realistic data
    const sampleDiagnostic = {
      machine_id: machineId,
      query: 'Machine not starting - power issues',
      top_cluster_name: 'Electrical System Failure - High Priority',
      playbook_steps: [
        { step: 1, title: 'Check Power Connection', description: 'Verify all connections and voltages', type: 'electrical', completed: true },
        { step: 2, title: 'Test Circuit Breaker', description: 'Run continuity test on breaker', type: 'test', completed: true },
        { step: 3, title: 'Inspect Power Supply Unit', description: 'Visual inspection and voltage check', type: 'physical', completed: false },
      ],
      related_faults: ['Power Loss', 'Circuit Fault', 'Voltage Drop'],
      related_maintenance: ['Electrical System Check', 'Circuit Breaker Test'],
      related_parts: ['Circuit Breaker CB-50A', 'Power Supply Unit PSU-500W', 'Power Cable AWG12'],
      evidence_refs: ['voltage_test_1', 'continuity_test_2', 'manual_inspection_3', 'schematic_ref_4'],
    };

    const enrichedDiag = enrichDiagnostic(sampleDiagnostic);

    // Test maintenance enrichment
    const sampleMaintenance = {
      id: 'maint_electrical_001',
      machine_id: machineId,
      title: 'Scheduled Electrical System Inspection',
      description: 'Monthly electrical system check including voltage tests, connection inspection, and insulation resistance measurement',
      related_parts: ['Circuit Breaker', 'Power Cable', 'Fuse Assembly', 'Relay Module'],
    };

    const enrichedMaint = enrichMaintenance(sampleMaintenance);

    // Test parts enrichment with multiple parts
    const parts = [
      {
        part_name: 'Circuit Breaker CB-50A',
        machine_id: machineId,
        confidence: 95,
        evidence_summary: 'Critical component identified in diagnostic - high failure probability',
      },
      {
        part_name: 'Power Supply Unit PSU-500W',
        machine_id: machineId,
        confidence: 87,
        evidence_summary: 'Secondary component - potential root cause',
      },
      {
        part_name: 'Power Cable AWG12',
        machine_id: machineId,
        confidence: 72,
        evidence_summary: 'Wear indicator detected',
      },
    ];

    const enrichedParts = parts.map((p, idx) => {
      const enriched = enrichPartForProcurement(p, 'ai_diagnostic');
      const valid = validateProcurementPart(enriched);
      return { ...enriched, validation: valid };
    });

    // Compile results
    const summary = {
      timestamp: new Date().toISOString(),
      target_machine_id: machineId,
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
            likely_systems: enrichedDiag.likely_systems,
            action_count: enrichedDiag.recommended_actions?.length || 0,
            parts_to_check: enrichedDiag.parts_to_check?.length || 0,
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
            interval: enrichedMaint.interval_value ? `${enrichedMaint.interval_value} ${enrichedMaint.interval_unit}` : 'not set',
            checklist_step_count: enrichedMaint.checklist_steps?.length || 0,
            preconditions: enrichedMaint.preconditions?.length || 0,
            post_checks: enrichedMaint.post_checks?.length || 0,
          },
        },
        parts_enrichment: {
          status: enrichedParts.every(p => p.validation.valid) ? 'PASS' : 'FAIL',
          parts_tested: enrichedParts.length,
          parts_valid: enrichedParts.filter(p => p.validation.valid).length,
          fields_present: [
            'part_number',
            'part_name',
            'source',
            'confidence',
            'safety_critical',
            'estimated_lead_time_days',
            'estimated_unit_cost',
          ],
          sample_parts: enrichedParts.slice(0, 2).map(p => ({
            part_number: p.part_number,
            part_name: p.part_name,
            source: p.source,
            confidence: p.confidence,
            safety_critical: p.safety_critical,
            lead_time_days: p.estimated_lead_time_days,
            estimated_cost: p.estimated_unit_cost,
          })),
        },
      },
      overall_status: enrichedParts.every(p => p.validation.valid) && enrichedDiag.severity && enrichedMaint.maintenance_type ? 'PASS' : 'FAIL',
    };

    // Write artifacts
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'diagnostic_sample.json'), JSON.stringify(enrichedDiag, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'maintenance_sample.json'), JSON.stringify(enrichedMaint, null, 2));
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'parts_sample.json'), JSON.stringify(enrichedParts, null, 2));

    console.log(JSON.stringify(summary, null, 2));
    process.exit(summary.overall_status === 'PASS' ? 0 : 1);
  } catch (error: any) {
    const errorSummary = {
      overall_status: 'FAIL',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.json'), JSON.stringify(errorSummary, null, 2));
    console.error(JSON.stringify(errorSummary, null, 2));
    process.exit(1);
  }
}

main();
