import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'STABILIZATION_ACTIVE',
        timestamp: new Date().toISOString(),
        version: '1.0.3-HARD-DYNAMIC'
    });
}
