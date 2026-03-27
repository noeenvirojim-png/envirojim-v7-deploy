import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    const [machinesRes, docsRes, ticketsRes, woRes, poRes] = await Promise.all([
      supabase.from('machines').select('count', { count: 'exact' }),
      supabase.from('documents').select('count', { count: 'exact' }),
      supabase.from('internal_tickets').select('count', { count: 'exact' }),
      supabase.from('work_orders').select('count', { count: 'exact' }),
      supabase.from('part_orders').select('count', { count: 'exact' }),
    ]);

    return NextResponse.json({
      tables: {
        machines: machinesRes.count || 0,
        documents: docsRes.count || 0,
        internal_tickets: ticketsRes.count || 0,
        work_orders: woRes.count || 0,
        part_orders: poRes.count || 0,
      },
      status: 'Database diagnostic completed',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      hint: 'Database connection issue or tables missing',
    });
  }
}
