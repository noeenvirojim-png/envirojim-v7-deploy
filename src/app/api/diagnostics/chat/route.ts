import { processDiagnosticRetrieval } from '@/domain/ai/pipelines/retrieval-pipeline';
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
        const { machineId, query } = body;

        if (!machineId || !query) {
            return NextResponse.json({ success: false, error: 'machineId and query are required' }, { status: 400 });
        }

        // Run the optimized retrieval pipeline. Target latency < 2s.
        const aiResponse = await processDiagnosticRetrieval(query, machineId);

        // Async Background Telemetry: Log the question to history
        // Use non-blocking promise without await to prevent TTFT slowdown
        const orgId = user.user_metadata?.org_id;
        if (orgId) {
            supabase.from('diagnostic_history').insert({
                machine_id: machineId,
                organization_id: orgId,
                technician_id: user.id,
                symptoms_described: query,
                ai_response: aiResponse
            }).then(({ error }) => {
                if (error) console.error('Failed to log diagnostic history:', error.message);
            });
        }

        return NextResponse.json({ success: true, data: aiResponse });

    } catch (error: any) {
        console.error('[API DIAGNOSTICS] POST failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Diagnostic Processing Failed'
        }, { status: 500 });
    }
}
