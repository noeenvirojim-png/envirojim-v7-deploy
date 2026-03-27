/**
 * ENVIROJIM — MaintenanceAssistantService
 * Returns due/overdue maintenance tasks for a machine family.
 * All tasks are document-backed. Required parts include order safety status.
 */

import { MachineKnowledgeRepository } from '../repositories/MachineKnowledgeRepository';
import { EvidenceService } from './EvidenceService';
import type { MaintenanceAssistantOutput, MaintenanceTask, CandidatePart, RiskLevel } from '../contracts';

const RISK_RANK: Record<RiskLevel, number> = {
  none: 0, low: 1, medium: 2, high: 3, critical: 4,
};

function maxRisk(risks: RiskLevel[]): RiskLevel {
  return risks.reduce((max, r) =>
    RISK_RANK[r] > RISK_RANK[max] ? r : max, 'none' as RiskLevel);
}

export class MaintenanceAssistantService {
  private repo = new MachineKnowledgeRepository();
  private evidenceService = new EvidenceService();

  async getTasksForFamily(
    familyId: string,
    machineId: string,
    filterIntervalType?: string,
  ): Promise<MaintenanceAssistantOutput> {
    const rawTasks = await this.repo.getMaintenanceTasksByFamily(familyId);

    const filtered = filterIntervalType
      ? rawTasks.filter((t: any) => t.interval_type === filterIntervalType)
      : rawTasks;

    const tasks: MaintenanceTask[] = [];
    const allRequiredParts: CandidatePart[] = [];

    for (const t of filtered) {
      const evidence = await this.evidenceService.getForObject('maintenance_task', t.id);

      const requiredParts: CandidatePart[] = (t.maintenance_task_parts ?? [])
        .filter((mtp: any) => mtp.parts)
        .map((mtp: any) => {
          const part = mtp.parts;
          return {
            part,
            order_safety_status: part.order_safety_status,
            what_to_confirm_before_order: part.order_safety_status !== 'safe_to_order'
              ? ['Verify part with technician before ordering']
              : [],
            evidence: [],
          } as CandidatePart;
        });

      allRequiredParts.push(...requiredParts);

      tasks.push({
        task_code: t.task_code,
        title: t.title,
        interval_type: t.interval_type,
        interval_value: t.interval_value,
        trigger_rule: t.trigger_rule,
        severity_if_skipped: t.severity_if_skipped,
        required_parts: requiredParts,
        procedure_code: t.procedures?.procedure_code ?? '',
        evidence,
      });
    }

    const overdue_risk = maxRisk(tasks.map(t => t.severity_if_skipped));
    const procedures = [...new Set(tasks.map(t => t.procedure_code).filter(Boolean))];
    const evidenceRefs = tasks.flatMap(t => t.evidence);

    return {
      machine_id: machineId,
      due_tasks: tasks,
      overdue_risk,
      required_parts: allRequiredParts,
      procedures,
      evidence: evidenceRefs,
    };
  }
}
