import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dbMapper } from '@/lib/db-mapper';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
    // Try organization_members first
    const { data: m } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
    if (m?.organization_id) return m.organization_id;
    // Fallback: users table
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
            .from('users')
            .select(`
                *,
                organization:organizations(*)
            `)
            .eq('role', 'TECHNICIAN')
            .is('deleted_at', null)
            .order('full_name');

        if (error) throw error;

        const mapped = data.map((row: any) => ({
            ...dbMapper.mapUser(row),
            organization: row.organization ? dbMapper.mapOrganization(row.organization) : null
        }));

        return NextResponse.json({ success: true, data: mapped });
    } catch (error: any) {
        console.error('[API TECHNICIANS] GET failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch technicians'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { full_name, email, phone } = body;

        if (!full_name?.trim()) {
            return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
        }
        if (!email?.trim()) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        const orgId = user.app_metadata?.organization_id || await resolveOrgId(supabase, user.id);
        if (!orgId) return NextResponse.json({ success: false, error: 'No organization context' }, { status: 403 });

        // Create auth user first via admin API would require service key.
        // Instead, insert directly into users table (they'll sign up separately)
        // Instead, insert directly into users table using admin client to bypass RLS
        const adminSupabase = createAdminClient();
        const { data: newUser, error: insertErr } = await adminSupabase
            .from('users')
            .insert({
                organization_id: orgId,
                full_name: full_name.trim(),
                email: email.trim().toLowerCase(),
                role: 'TECHNICIAN',
            })
            .select()
            .single();

        if (insertErr) {
            console.error('[API TECHNICIANS] POST insert error:', insertErr);
            if (insertErr.code === '23505') {
                return NextResponse.json({ success: false, error: 'A technician with this email already exists.' }, { status: 409 });
            }
            return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
        }

        // Also add to organization_members
        await supabase.from('organization_members').insert({
            organization_id: orgId,
            user_id: newUser.id,
            role: 'technician',
        }).select().maybeSingle();

        return NextResponse.json({ success: true, data: dbMapper.mapUser(newUser) }, { status: 201 });
    } catch (error: any) {
        console.error('[API TECHNICIANS] POST failed:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to create technician' }, { status: 500 });
    }
}
