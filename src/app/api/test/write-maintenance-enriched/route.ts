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
      .select('id, name')
      .eq('id', machine_id)
      .single();

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Create work_order with enriched maintenance structure
    const { data: wo, error } = await supabase
      .from('work_orders')
      .insert({
        machine_id,
        title: enriched_data.maintenance_type || enriched_data.name || 'Maintenance Task',
        description: enriched_data.preconditions?.join('; ') || '',
        priority: enriched_data.priority || 'normal',
        status: 'draft',
        estimated_hours: (enriched_data.estimated_duration_minutes || 60) / 60,
        metadata: enriched_data,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create checklist steps if present
    let steps_created = 0;
    if (enriched_data.checklist_steps && Array.isArray(enriched_data.checklist_steps)) {
      const steps_data = enriched_data.checklist_steps.map((step: any, idx: number) => ({
        work_order_id: wo.id,
        step_number: idx + 1,
        description: step.description || step,
        completed: false,
      }));

      const { error: steps_error } = await supabase
        .from('work_order_steps')
        .insert(steps_data);

      if (!steps_error) steps_created = steps_data.length;
    }

    // Verify write
    const { data: verified } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', wo.id)
      .single();

    return NextResponse.json({
      success: true,
      work_order_id: wo.id,
      machine_id,
      steps_created,
      verified: !!verified,
      source_enriched: enriched_data.checklist_steps ? true : false,
      checklist_exploitable: enriched_data.checklist_steps?.length > 0 ? true : false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
