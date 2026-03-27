import { NextRequest, NextResponse } from 'next/server';
import { ChecklistAssistantService } from '@/lib/machines/intelligence/services/ChecklistAssistantService';
import { resolveMachineFamily, MachineResolutionError } from '@/lib/machines/intelligence/adapters/resolveMachineFamily';
import type { ChecklistAudience, ChecklistType } from '@/lib/machines/intelligence/contracts';

export async function GET(
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

  const audience = (request.nextUrl.searchParams.get('audience') ?? 'operator') as ChecklistAudience;
  const type = request.nextUrl.searchParams.get('type') as ChecklistType | undefined;

  const service = new ChecklistAssistantService();
  const result = await service.getChecklist(resolution.family_id, audience, type ?? undefined);

  if (!result) {
    return NextResponse.json({ error: 'no checklist found for this machine family and audience' }, { status: 404 });
  }
  return NextResponse.json(result);
}
