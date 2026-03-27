import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Create test machine matching VB750 DK-1211 profile
    const { data: machine, error } = await supabase
      .from('machines')
      .insert({
        name: 'VB750 DK -1211',
        folder_name: 'VB750_DK_-1211_test',
        machine_type: 'industrial_press',
        status: 'active',
        org_id: 'test-org-enriched-proof',
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      machine_id: machine.id,
      machine_name: 'VB750 DK -1211',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
