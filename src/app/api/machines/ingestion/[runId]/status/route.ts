import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const supabase = createClient();
    const runId = params.runId;

    const { data: run, error } = await supabase
      .from('machine_ingestion_runs')
      .select('*, steps:machine_ingestion_steps(*)')
      .eq('id', runId)
      .single();

    if (error) throw error;
    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    return NextResponse.json(run);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
