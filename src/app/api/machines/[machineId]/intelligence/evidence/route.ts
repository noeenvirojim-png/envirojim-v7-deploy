import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient();
    const machineId = params.machineId;

    const { data: evidence, error } = await supabase
      .from('machine_kb_evidence')
      .select('*, document:machine_documents(*)')
      .eq('machine_id', machineId)
      .limit(50);

    if (error) throw error;
    return NextResponse.json(evidence);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
