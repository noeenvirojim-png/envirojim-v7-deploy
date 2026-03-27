import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MachineIngestionService } from '@/lib/machines/intelligence/MachineIngestionService';

export async function POST(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient();
    const machineId = params.machineId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Organization not found' }, { status: 403 });

    const service = new MachineIngestionService(process.env.GEMINI_API_KEY!);
    
    // Start the run (Phase 1)
    const runId = await service.startRun(machineId, profile.organization_id, user.id);

    // Trigger asynchronous pipeline phases (in a production environment, this would be a background job)
    // For now, we trigger them asynchronously without awaiting here
    (async () => {
        try {
            await service.runInventory(runId);
            await service.runAllDocumentExtracts(runId);
            await service.runConsolidation(runId);
            await service.runGraphBuild(runId);
            await service.runAudit(runId);
            await service.runGapRepair(runId);
        } catch (e) {
            console.error('Ingestion pipeline failed:', e);
        }
    })();

    return NextResponse.json({ success: true, runId });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
