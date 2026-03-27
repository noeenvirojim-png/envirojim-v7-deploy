import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient();
    const machineId = params.machineId;

    const { data: run, error } = await supabase
      .from('machine_ingestion_runs')
      .select('*, steps:machine_ingestion_steps(*)')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!run) return NextResponse.json({ error: 'No run found for this machine' }, { status: 404 });

    return NextResponse.json(run);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
