import { NextRequest, NextResponse } from 'next/server';
import { PartsAssistantService } from '@/lib/machines/intelligence/services/PartsAssistantService';
import { resolveMachineFamily, MachineResolutionError } from '@/lib/machines/intelligence/adapters/resolveMachineFamily';

export async function GET(
  request: NextRequest,
  { params }: { params: { machineId: string } },
) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q query param required' }, { status: 400 });

  let resolution;
  try {
    resolution = await resolveMachineFamily(params.machineId);
  } catch (e) {
    if (e instanceof MachineResolutionError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }

  const service = new PartsAssistantService();
  const result = await service.query(resolution.family_id, q);
  return NextResponse.json(result);
}
