import { NextResponse } from 'next/server';
import { runWorkerBatch } from '@/lib/worker/pdf-processor';

// GET /api/worker/run
// Called by Vercel Cron every 60 seconds
// Protected by CRON_SECRET — never expose publicly
// Config in vercel.json:
// {
//   "crons": [{ "path": "/api/worker/run", "schedule": "* * * * *" }]
// }

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: max 60s, use for heavy PDF processing

export async function GET(request: Request) {
    // Security: Vercel automatically sets Authorization header with CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.error(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'warn',
            event: 'worker_unauthorized_trigger',
            header: authHeader?.slice(0, 20)
        }));
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await runWorkerBatch();
        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        console.error(JSON.stringify({
            ts: new Date().toISOString(),
            level: 'error',
            event: 'worker_run_exception',
            error: msg
        }));
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
