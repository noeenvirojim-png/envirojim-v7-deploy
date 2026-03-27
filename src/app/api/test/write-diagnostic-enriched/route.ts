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

    // Write internal_ticket with enriched metadata
    const { data: ticket, error } = await supabase
      .from('internal_tickets')
      .insert({
        machine_id,
        title: enriched_data.top_cluster_name || 'Diagnostic Issue',
        description: enriched_data.evidence_summary || '',
        severity: enriched_data.severity || 'medium',
        confidence: enriched_data.confidence || 50,
        source: 'diagnostic_enriched',
        metadata: enriched_data,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verify write
    const { data: verified } = await supabase
      .from('internal_tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    return NextResponse.json({
      success: true,
      ticket_id: ticket.id,
      machine_id,
      verified: !!verified,
      source_enriched: enriched_data.severity && enriched_data.confidence ? true : false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
