import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        const sn = searchParams.get('serial_number');

        const supabase = createClient();
        let query = supabase
            .from('machines')
            .select(`
                *,
                checklists:checklists(*),
                documents:documents(*),
                interventions:interventions(*)
            `)
            .is('deleted_at', null);

        if (name) {
            query = query.or(`make.ilike.%${name}%,model.ilike.%${name}%`);
        }

        if (sn) {
            query = query.eq('serial_number', sn);
        }

        const { data, error } = await query;

        if (error) throw error;

        const mapped = data.map(dbMapper.mapMachine);

        return NextResponse.json({ success: true, data: mapped });
    } catch (error: any) {
        console.error('[API MACHINES] GET failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch machines'
        }, { status: 500 });
    }
}
