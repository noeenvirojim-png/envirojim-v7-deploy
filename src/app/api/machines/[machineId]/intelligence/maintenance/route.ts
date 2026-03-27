import { NextRequest, NextResponse } from 'next/server';
import { MaintenanceAssistantService } from '@/lib/machines/intelligence/services/MaintenanceAssistantService';
import { resolveMachineFamily, MachineResolutionError } from '@/lib/machines/intelligence/adapters/resolveMachineFamily';

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

  const intervalType = request.nextUrl.searchParams.get('interval_type') ?? undefined;
  const service = new MaintenanceAssistantService();
  const result = await service.getTasksForFamily(resolution.family_id, params.machineId, intervalType);
  return NextResponse.json(result);
}
