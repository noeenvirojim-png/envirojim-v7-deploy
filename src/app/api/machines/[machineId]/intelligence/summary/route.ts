import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const supabase = createClient();
    const machineId = params.machineId;

    const { data: kb } = await supabase
      .from('machine_kb')
      .select('id, status, created_at')
      .eq('machine_id', machineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!kb) return NextResponse.json({ error: 'KB not found' }, { status: 404 });

    const { count: entitiesCount } = await supabase
      .from('machine_kb_entities')
      .select('*', { count: 'exact', head: true })
      .eq('kb_id', kb.id);

    return NextResponse.json({
      kb_id: kb.id,
      status: kb.status,
      entities_count: entitiesCount || 0,
      last_updated: kb.created_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
