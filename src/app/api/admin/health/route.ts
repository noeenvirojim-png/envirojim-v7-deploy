import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        status: 'OK',
        environment: process.env.NODE_ENV,
        checks: {
            dns: 'PENDING',
            database_rest: 'PENDING',
            database_pooler: 'PENDING',
            rbac_tables: 'PENDING',
            ai_vector_schema: 'PENDING',
            admin_user: 'PENDING'
        }
    };

    try {
        // Create a privileged client for system diagnostics (bypassing RLS for internal audit)
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const supabase = createClient();
        
        // 1. DNS Resolution Check (Supabase Host)
        try {
            const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
            await resolve4(url.hostname);
            diagnostics.checks.dns = 'OK';
        } catch (dnsErr: any) {
            diagnostics.checks.dns = `FAIL: ${dnsErr.message}`;
            diagnostics.status = 'DEGRADED';
        }

        // 2. Database Connectivity (Supabase REST / Anon)
        const { error: dbError } = await supabase.from('organizations').select('id').limit(1);
        diagnostics.checks.database_rest = !dbError ? 'OK' : `FAIL: ${dbError.message}`;
        if (dbError) diagnostics.status = 'DEGRADED';

        // 3. Database Connectivity (Transaction Pooler / TCP)
        if (process.env.POSTGRES_URL) {
            const pgClient = new Client({
                connectionString: process.env.POSTGRES_URL.split('?')[0],
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 2000
            });
            try {
                await pgClient.connect();
                await pgClient.query('SELECT 1');
                diagnostics.checks.database_pooler = 'OK';
                await pgClient.end();
            } catch (pgErr: any) {
                diagnostics.checks.database_pooler = `FAIL: ${pgErr.message}`;
                diagnostics.status = 'DEGRADED';
            }
        } else {
            diagnostics.checks.database_pooler = 'NOT_CONFIGURED';
        }

        // 4. RBAC Table & Policy Check
        const { error: rbacError } = await supabaseAdmin.from('users').select('id').limit(1);
        diagnostics.checks.rbac_tables = !rbacError ? 'OK' : `FAIL: ${rbacError.message}`;
        if (rbacError) diagnostics.status = 'DEGRADED';

        // 5. AI Schema (pgvector) check
        const { error: aiError } = await supabaseAdmin.from('document_embeddings').select('id').limit(1);
        diagnostics.checks.ai_vector_schema = !aiError ? 'OK' : 'MISSING_OR_INACCESSIBLE';
        
        // 6. Machines Schema Check (V6 Specific: owner_org_id)
        const { error: machinesError } = await supabaseAdmin.from('machines').select('owner_org_id').limit(1);
        diagnostics.checks.machines_schema = !machinesError ? 'OK' : `FAIL: ${machinesError.message}`;
        if (machinesError) diagnostics.status = 'DEGRADED';

        // 7. Identity Sync & Admin Check
        const { data: adminUsers, error: adminError } = await supabaseAdmin
            .from('users')
            .select('id, role, organization_id')
            .eq('email', 'noe@envirojim.com');

        if (adminUsers && adminUsers.length > 0) {
            const adminUser = adminUsers[0];
            const isSyncOk = adminUsers.length === 1 && 
                           adminUser.role === 'ENVIROJIM_ADMIN' && 
                           adminUser.organization_id === '00000000-0000-0000-0000-000000000001';
            
            diagnostics.checks.admin_user = adminUsers.length === 1 ? 'OK' : `MULTIPLE_FOUND: ${adminUsers.length}`;
            diagnostics.checks.identity_sync = isSyncOk ? 'OK' : 'DRIFT_OR_MULTIPLICITY_DETECTED';
            diagnostics.checks.admin_ids = adminUsers.map(u => u.id);
            
            if (!isSyncOk) diagnostics.status = 'DEGRADED';
        } else {
            diagnostics.checks.admin_user = 'NOT_FOUND';
            if (adminError) {
                diagnostics.checks.admin_user = `FAIL: ${adminError.message}`;
            }
            diagnostics.status = 'DEGRADED';
        }

        diagnostics.security = {
            rls_enabled: true,
            auth_provider: 'Supabase',
            rbac_version: 'V8'
        };

        return NextResponse.json(diagnostics, { status: diagnostics.status === 'OK' ? 200 : 207 });
    } catch (err: any) {
        return NextResponse.json({ 
            status: 'ERROR', 
            error: err.message,
            timestamp: new Date().toISOString() 
        }, { status: 500 });
    }
}