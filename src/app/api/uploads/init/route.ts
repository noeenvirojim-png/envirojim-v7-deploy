import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// POST /api/uploads/init
// Returns a signed upload URL for direct client → Supabase Storage upload
// Client uploads directly to storage — API route is never in the data path

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const SIGNED_URL_TTL_SECONDS = 300; // 5 min to complete upload

const InitSchema = z.object({
    file_name: z.string().min(1).max(255).refine(
        f => f.toLowerCase().endsWith('.pdf'),
        { message: 'Only PDF files are accepted' }
    ),
    file_size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, 'File too large (max 50 MB)'),
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

        const parsed = InitSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { file_name, file_size } = parsed.data;

        // Unique file path per org — prevents collisions across tenants
        const timestamp = Date.now();
        const sanitizedName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${orgId}/${timestamp}_${sanitizedName}`;

        // Create signed upload URL (client will PUT directly to storage)
        const { data: signedData, error: signedError } = await supabase.storage
            .from('pdf-uploads')
            .createSignedUploadUrl(filePath);

        if (signedError || !signedData) {
            log('error', 'upload_init_failed', { userId: user.id, error: signedError?.message });
            return NextResponse.json({ success: false, error: 'Failed to generate upload URL' }, { status: 500 });
        }

        log('info', 'upload_init_ok', { userId: user.id, orgId, filePath, fileSize: file_size });

        return NextResponse.json({
            success: true,
            data: {
                signed_url: signedData.signedUrl,
                token: signedData.token,
                file_path: filePath,
                expires_in: SIGNED_URL_TTL_SECONDS,
            }
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        log('error', 'upload_init_exception', { error: msg });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
