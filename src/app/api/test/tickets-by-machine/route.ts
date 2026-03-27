import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint only - returns internal_tickets for a machine.
 * Used for E2E test verification of database writes.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromSession();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const machineId = req.nextUrl.searchParams.get('machine_id');
  if (!machineId) {
    return NextResponse.json({ error: 'machine_id required' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    const { data: tickets, error } = await supabase
      .from('internal_tickets')
      .select('id, title, status, created_at, machine_id')
      .eq('machine_id', machineId)
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ tickets, count: tickets?.length || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
