/**
 * ENVIROJIM — ChecklistAssistantService
 * Returns checklist from document-backed templates.
 * Each item includes source evidence.
 */

import { MachineKnowledgeRepository } from '../repositories/MachineKnowledgeRepository';
import { EvidenceService } from './EvidenceService';
import type { ChecklistOutput, ChecklistItem, ChecklistAudience, ChecklistType } from '../contracts';

export class ChecklistAssistantService {
  private repo = new MachineKnowledgeRepository();
  private evidenceService = new EvidenceService();

  async getChecklist(
    familyId: string,
    audience: ChecklistAudience,
    checklistType?: ChecklistType,
  ): Promise<ChecklistOutput | null> {
    const templates = await this.repo.getChecklistTemplatesByAudience(familyId, audience);

    const template = checklistType
      ? templates.find((t: any) => t.checklist_type === checklistType)
      : templates[0];

    if (!template) return null;

    const rawItems: any[] = (template.checklist_items ?? [])
      .sort((a: any, b: any) => a.item_no - b.item_no);

    const items: ChecklistItem[] = await Promise.all(
      rawItems.map(async (item: any) => {
        const evidence = await this.evidenceService.getForObject('checklist_item', item.id);
        return {
          item_no: item.item_no,
          item_text: item.item_text,
          reason_text: item.reason_text,
          expected_result: item.expected_result,
          action_if_fail: item.action_if_fail,
          evidence,
        };
      })
    );

    return {
      checklist_title: template.title,
      audience: template.audience,
      checklist_type: template.checklist_type,
      items,
    };
  }

  async getChecklistByCode(familyId: string, templateCode: string): Promise<ChecklistOutput | null> {
    const template = await this.repo.getChecklistTemplate(familyId, templateCode);
    if (!template) return null;

    const rawItems: any[] = (template.checklist_items ?? [])
      .sort((a: any, b: any) => a.item_no - b.item_no);

    const items: ChecklistItem[] = await Promise.all(
      rawItems.map(async (item: any) => {
        const evidence = await this.evidenceService.getForObject('checklist_item', item.id);
        return {
          item_no: item.item_no,
          item_text: item.item_text,
          reason_text: item.reason_text,
          expected_result: item.expected_result,
          action_if_fail: item.action_if_fail,
          evidence,
        };
      })
    );

    return {
      checklist_title: template.title,
      audience: template.audience,
      checklist_type: template.checklist_type,
      items,
    };
  }
}
