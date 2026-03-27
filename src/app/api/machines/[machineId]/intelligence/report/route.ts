import { NextRequest, NextResponse } from 'next/server';
import { TechReportAssistantService } from '@/lib/machines/intelligence/services/TechReportAssistantService';
import { resolveMachineFamily, MachineResolutionError } from '@/lib/machines/intelligence/adapters/resolveMachineFamily';
import type { TechReportInput } from '@/lib/machines/intelligence/services/TechReportAssistantService';

export async function POST(
  request: NextRequest,
  { params }: { params: { machineId: string } },
) {
  let resolution;
  try {
    resolution = await resolveMachineFamily(params.machineId);
  } catch (e) {
    if (e instanceof MachineResolutionError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }

  const body = await request.json();
  if (!body.symptom_observed) {
    return NextResponse.json({ error: 'symptom_observed required' }, { status: 400 });
  }

  const input: TechReportInput = {
    family_id: resolution.family_id,
    symptom_observed: body.symptom_observed ?? '',
    conditions_of_occurrence: body.conditions_of_occurrence ?? '',
    tests_performed: body.tests_performed ?? [],
    findings: body.findings ?? '',
    probable_cause: body.probable_cause ?? '',
    confirmed: body.confirmed ?? false,
    action_taken: body.action_taken ?? '',
    parts_used_ids: body.parts_used_ids ?? [],
    follow_up: body.follow_up ?? '',
  };

  const service = new TechReportAssistantService();
  const result = await service.buildReport(input);
  return NextResponse.json(result);
}
