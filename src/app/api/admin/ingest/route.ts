import { processManualIngestionPipeline } from '@/domain/ai/pipelines/ingestion-pipeline';
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
        const { machineId, storageUrl } = body;

        // Verify correct role/org before triggering heavy background job
        let orgId = user.user_metadata?.org_id;
        if (!orgId) {
            // Fallback: fetch org_id from users table
            const { data: userRecord } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            orgId = userRecord?.organization_id;
        }
        if (!orgId) return NextResponse.json({ success: false, error: 'No org context' }, { status: 403 });

        // Fire-and-forget the processing pipeline so the user doesn't wait for Vercel 
        // Note: For Next 14+ on Vercel, consider wrapping this in `unstable_after()`
        processManualIngestionPipeline(machineId, storageUrl, orgId).catch(console.error);

        return NextResponse.json({
            success: true,
            message: 'Manual background ingestion successfully queued.'
        }, { status: 202 });

    } catch (error: any) {
        console.error('[API INGEST] POST failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to trigger ingestion queue'
        }, { status: 500 });
    }
}
