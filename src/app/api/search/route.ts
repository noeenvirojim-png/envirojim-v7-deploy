import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ success: true, data: [] });
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from('parts_catalog')
            .select('*')
            .or(`name.ilike.%${query}%,part_number.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(10);

        if (error) throw error;

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error: any) {
        console.error('[API SEARCH] GET failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Search failed'
        }, { status: 500 });
    }
}
