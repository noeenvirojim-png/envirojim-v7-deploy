import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
    const { data: m } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
    if (m?.organization_id) return m.organization_id;
    const { data: u } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();
    return u?.organization_id ?? null;
}

export async function GET() {
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .order('name');

        if (error) throw error;
        return NextResponse.json({ success: true, data: data.map((row: any) => dbMapper.mapOrganization(row)) });
    } catch (error: any) {
        console.error('[API CLIENTS] GET failed:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch clients' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { name, type, qb_customer_id, contact_email, contact_phone, address } = body;

        if (!name?.trim()) {
            return NextResponse.json({ success: false, error: 'Organization name is required' }, { status: 400 });
        }

        const adminSupabase = createAdminClient();
        const { data: newOrg, error: insertErr } = await adminSupabase
            .from('organizations')
            .insert({
                name: name.trim(),
                type: type || 'CLIENT',
                qb_customer_id: qb_customer_id?.trim() || null,
                contact_email: contact_email?.trim() || null,
                contact_phone: contact_phone?.trim() || null,
                address: address?.trim() || null,
            })
            .select()
            .single();

        if (insertErr) {
            console.error('[API CLIENTS] POST insert error:', insertErr);
            if (insertErr.code === '23505') {
                return NextResponse.json({ success: false, error: 'A client with this name already exists.' }, { status: 409 });
            }
            return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: dbMapper.mapOrganization(newOrg) }, { status: 201 });
    } catch (error: any) {
        console.error('[API CLIENTS] POST failed:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to create client' }, { status: 500 });
    }
}
