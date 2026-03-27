import { QaAuditResultSchema } from './schemas';

export class QualityAuditService {
  /**
   * Audits the consolidated Machine KB for quality and gaps.
   */
  async runAudit(kb: any, entities: any[], graphs: any[]): Promise<any> {
    const gaps: string[] = [];
    const safetyRisks: string[] = [];
    const weakEvidence: string[] = [];

    // 1. Check for basic identity
    if (!kb.machine_profile?.model) {
      gaps.push('Missing machine model identification');
    }

    // 2. Check for Safety Warnings
    const warnings = entities.filter(e => e.entity_type === 'warning');
    if (warnings.length === 0) {
      safetyRisks.push('No safety warnings extracted. This is highly unusual for industrial machinery.');
    }

    // 3. Check for Maintenance Schedule
    const maintenance = entities.filter(e => e.entity_type === 'maintenance_task');
    if (maintenance.length === 0) {
      gaps.push('No maintenance tasks found. Preventive maintenance schedule is missing.');
    }

    // 4. Check Evidence Quality
    entities.forEach(entity => {
      if (!entity.evidence || entity.evidence.length === 0) {
        weakEvidence.push(`Entity "${entity.canonical_name}" has no direct evidence.`);
      }
    });

    const productionReady = gaps.length === 0 && safetyRisks.length === 0;

    return {
      production_ready: productionReady,
      overall_risk: safetyRisks.length > 0 ? 'high' : (gaps.length > 3 ? 'medium' : 'low'),
      coverage_gaps: gaps,
      weak_evidence_items: weakEvidence,
      safety_risks: safetyRisks,
      final_verdict: productionReady 
        ? 'Machine intelligence layer is comprehensive and ready.' 
        : `Unready. Missing ${gaps.length} critical components and ${safetyRisks.length} safety items.`
    };
  }
}
