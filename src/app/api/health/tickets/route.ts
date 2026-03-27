import { NextResponse } from 'next/server';
import { TicketsService } from '@/domain/support/data/tickets';
import { dbMapper } from '@/lib/db-mapper';

export async function GET() {
    try {
        const rawData = await TicketsService.getTicketsRaw();
        const result = dbMapper.safeMap(rawData, dbMapper.mapTicket, 'HealthCheck_Tickets');

        let status: 'ok' | 'degraded' | 'error' = 'ok';

        if (result.invalid > 0) {
            status = 'degraded';
        }

        if (result.total > 0 && result.valid === 0) {
            status = 'error';
        }

        return NextResponse.json({
            status,
            total: result.total,
            valid: result.valid,
            invalid: result.invalid
        });

    } catch (error) {
        return NextResponse.json({
            status: 'error',
            total: 0,
            valid: 0,
            invalid: 0,
            message: 'Critical service failure'
        }, { status: 200 }); // Always 200 to allow diagnostic rendering
    }
}
