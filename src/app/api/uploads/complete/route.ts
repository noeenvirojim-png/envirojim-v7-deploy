import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// POST /api/uploads/complete
// Called AFTER client has successfully uploaded PDF to storage
// Creates the pdf_job DB record → triggers async processing

const CompleteSchema = z.object({
    file_path: z.string().min(1).max(1000),
    file_name: z.string().min(1).max(255),
});

function log(level: 'info' | 'warn' | 'error', event: string, ctx?: Record<string, unknown>) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        JSON.stringify({ ts: new Date().toISOString(), level, event, ...ctx })
    );
}

export async function POST(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const orgId = user.app_metadata?.organization_id || user.user_metadata?.org_id;
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'No organization context' }, { status: 403 });
        }

        const raw = await request.json().catch(() => null);
        if (!raw) return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });

        const parsed = CompleteSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { file_path, file_name } = parsed.data;

        // Security: ensure the file_path belongs to this org
        // (format is `{orgId}/{timestamp}_{filename}`)
        if (!file_path.startsWith(`${orgId}/`)) {
            log('warn', 'upload_complete_path_spoof', { userId: user.id, orgId, file_path });
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Verify the file actually exists in storage before creating job
        const { data: fileCheck } = await supabase.storage
            .from('pdf-uploads')
            .list(orgId, { search: file_path.replace(`${orgId}/`, '') });

        if (!fileCheck || fileCheck.length === 0) {
            log('warn', 'upload_complete_file_missing', { userId: user.id, file_path });
            return NextResponse.json({ success: false, error: 'File not found in storage' }, { status: 404 });
        }

        // Create pdf_job — UNIQUE constraint on (organization_id, file_path) prevents duplicates
        const { data: job, error: jobError } = await supabase
            .from('pdf_jobs')
            .insert({
                organization_id: orgId,
                uploaded_by: user.id,
                file_path,
                file_name,
                status: 'PENDING',
            })
            .select()
            .single();

        if (jobError) {
            // 23505 = already queued (user re-submitted same file)
            if ((jobError as { code?: string }).code === '23505') {
                log('info', 'upload_complete_duplicate', { userId: user.id, file_path });
                return NextResponse.json({ success: true, message: 'Already queued', data: null });
            }
            throw jobError;
        }

        log('info', 'upload_complete_job_created', { userId: user.id, orgId, jobId: job.id, file_path });

        return NextResponse.json({ success: true, data: { job_id: job.id, status: job.status } }, { status: 201 });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        log('error', 'upload_complete_exception', { error: msg });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
