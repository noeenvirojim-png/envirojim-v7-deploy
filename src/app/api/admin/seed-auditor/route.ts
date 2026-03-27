import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    // SECURITY: This route is for production bootstrap and must be deleted after certification
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = 'auditor-v6@envirojim.com';
    const password = 'EnviroJim2024!';
    const orgId = '00000000-0000-0000-0000-000000000001';

    try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users.find(u => u.email === email);

        let userId;
        if (existing) {
            userId = existing.id;
            await supabase.auth.admin.updateUserById(userId, { 
                password,
                user_metadata: { role: 'ENVIROJIM_ADMIN', full_name: 'Enterprise Auditor' }
            });
        } else {
            const { data, error } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { role: 'ENVIROJIM_ADMIN', full_name: 'Enterprise Auditor' }
            });
            if (error) throw error;
            userId = data.user.id;
        }

        await supabase.from('users').upsert({
            id: userId,
            email,
            organization_id: orgId,
            role: 'ENVIROJIM_ADMIN',
            full_name: 'Enterprise Auditor',
            updated_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true, message: 'Auditor seeded successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
