import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { diagnosticId, wasSuccessful, actualRootCause, repairPerformed } = body;

        if (!diagnosticId || typeof wasSuccessful !== 'boolean') {
            return NextResponse.json({ success: false, error: 'diagnosticId and wasSuccessful are required' }, { status: 400 });
        }

        const { error } = await supabase.from('technician_feedback').insert({
            diagnostic_id: diagnosticId,
            was_successful: wasSuccessful,
            actual_root_cause: actualRootCause || null,
            repair_performed: repairPerformed || null
        });

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Feedback successfully recorded for AI reinforcement learning.' });

    } catch (error: any) {
        console.error('[API FEEDBACK] POST failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to record diagnostic feedback'
        }, { status: 500 });
    }
}
