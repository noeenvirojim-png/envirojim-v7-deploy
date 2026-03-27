import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';

/**
 * AUTH SANITY CHECK
 * 
 * Verifies:
 * 1. Supabase Client Connectivity
 * 2. Current Session (if any)
 * 3. Environment Variable Integrity
 * 4. Database Table Accessibility
 */

export async function GET(request: NextRequest) {
    const results: any = {
        timestamp: new Date().toISOString(),
        env: {
            supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            postgres_url: !!process.env.POSTGRES_URL,
        },
        checks: {}
    };

    try {
        const supabase = createClient();
        
        // Check 1: Simple DB ping
        const { count, error: dbError } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
        results.checks.database_connection = !dbError ? '✅ OK' : `❌ FAILED: ${dbError.message}`;

        // Check 2: Auth Bridge Resolution
        try {
            const user = await getCurrentUserFromSession();
            results.checks.auth_bridge_user = user ? `✅ OK (${user.role})` : '⚠️ NO_SESSION';
        } catch (authErr: any) {
            results.checks.auth_bridge_user = `❌ CRASH: ${authErr.message}`;
        }

        // Check 3: Schema Tables (AI Intelligence)
        const { error: aiError } = await supabase.from('document_embeddings').select('id').limit(1);
        results.checks.ai_schema_ready = !aiError ? '✅ OK' : `⚠️ MISSING: ${aiError.message}`;

        return NextResponse.json(results);
    } catch (globalErr: any) {
        return NextResponse.json({ 
            success: false, 
            error: globalErr.message 
        }, { status: 500 });
    }
}
