import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Find VB750 DK-1211 or return first machine with PDFs
    const { data: machines } = await supabase
      .from('machines')
      .select('id, name, folder_name')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!machines || machines.length === 0) {
      return NextResponse.json({ error: 'No machines found' }, { status: 404 });
    }

    // Try to find VB750 DK-1211
    const targetMachine = machines.find(
      m => m.name?.includes('VB750') || m.folder_name?.includes('DK -1211') || m.folder_name?.includes('DK-1211')
    );

    return NextResponse.json({
      machines,
      target: targetMachine || machines[0],
      all_count: machines.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
