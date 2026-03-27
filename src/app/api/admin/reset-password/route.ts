import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY one-time password reset endpoint.
 * Called with X-Admin-Secret header to authenticate.
 * Remove after use.
 */
export async function POST(request: Request) {
    const secret = request.headers.get('x-admin-secret');
    const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-20);

    if (!secret || secret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { userId, newPassword } = await request.json();
        const supabase = createAdminClient();

        const { data, error } = await supabase.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            user: data.user?.email,
            message: 'Password updated successfully'
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
