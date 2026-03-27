import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { machine_id, enriched_data } = await req.json();

    if (!machine_id || !enriched_data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();

    // Verify machine exists
    const { data: machine } = await supabase
      .from('machines')
      .select('id, name, org_id')
      .eq('id', machine_id)
      .single();

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Guard: check part_number exists (minimal guard)
    if (!enriched_data.part_number) {
      return NextResponse.json({ error: 'No part_number in enriched data' }, { status: 400 });
    }

    // Create part_order with enriched procurement data
    const { data: order, error } = await supabase
      .from('part_orders')
      .insert({
        machine_id,
        org_id: machine.org_id,
        part_number: enriched_data.part_number,
        part_name: enriched_data.part_name || 'Unknown Part',
        quantity: 1,
        urgency: enriched_data.confidence >= 80 ? 'high' : 'normal',
        estimated_unit_cost: enriched_data.estimated_unit_cost || null,
        estimated_lead_time_days: enriched_data.estimated_lead_time_days || null,
        safety_critical: enriched_data.safety_critical || false,
        source: 'procurement_enriched',
        metadata: enriched_data,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verify write
    const { data: verified } = await supabase
      .from('part_orders')
      .select('*')
      .eq('id', order.id)
      .single();

    return NextResponse.json({
      success: true,
      order_id: order.id,
      machine_id,
      org_id: machine.org_id,
      part_number: enriched_data.part_number,
      verified: !!verified,
      source_enriched: enriched_data.confidence && enriched_data.part_number ? true : false,
      safety_critical_marked: enriched_data.safety_critical ? true : false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
