import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient();
    const machineId = params.machineId;

    const { data: map, error } = await supabase
      .from('machine_mental_maps')
      .select('*')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!map) return NextResponse.json({ error: 'Mental map not found' }, { status: 404 });

    return NextResponse.json(map);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
