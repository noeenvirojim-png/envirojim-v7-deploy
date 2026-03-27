import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * ENV DIAGNOSTIC — checks which Supabase values Vercel is using
 * Only safe because it doesn't expose the full key
 */
export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'MISSING';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING';
    const geminiKey = process.env.GEMINI_API_KEY || 'MISSING';

    return NextResponse.json({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX: anonKey.slice(0, 30) + '...',
        NEXT_PUBLIC_SUPABASE_ANON_KEY_VALID: anonKey.includes('ptznkpenefqhackdeau') ? '✅ REAL KEY' : '❌ MOCK/WRONG KEY',
        SUPABASE_SERVICE_ROLE_KEY_VALID: serviceKey.includes('ptznkpenefqhackdeau') ? '✅ REAL KEY' : '❌ MOCK/WRONG KEY',
        GEMINI_API_KEY_SET: geminiKey !== 'MISSING' ? '✅ SET' : '❌ MISSING',
        NODE_ENV: process.env.NODE_ENV,
    });
}
