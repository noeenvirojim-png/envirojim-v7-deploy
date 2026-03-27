import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const MAX_BODY_BYTES = 8_192; // 8 KB max payload
const PAGE_LIMIT = 50; // max tickets per page
const REQUEST_TIMEOUT_MS = 9_000; // 9s — under Vercel's 10s limit

// ─────────────────────────────────────────────────────────────
// In-memory Rate Limiter (per user, server memory — resets on deploy)
// For stateless at scale: swap for Upstash Redis + @upstash/ratelimit
// ─────────────────────────────────────────────────────────────
const RATE_WINDOW_MS = 10_000; // 10s window
const RATE_MAX_REQUESTS = 20;  // max 20 req / 10s per user

interface RateEntry { count: number; windowStart: number }
const rateStore = new Map<string, RateEntry>();

function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const entry = rateStore.get(userId);
    if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
        rateStore.set(userId, { count: 1, windowStart: now });
        return false;
    }
    if (entry.count >= RATE_MAX_REQUESTS) return true;
    entry.count++;
    return false;
}

// ─────────────────────────────────────────────────────────────
// Idempotency Store (in-memory, 5 min TTL — fine for create ops)
// ─────────────────────────────────────────────────────────────
interface IdempotencyEntry { result: object; expiresAt: number }
const idempotencyStore = new Map<string, IdempotencyEntry>();

function getCached(key: string): object | null {
    const entry = idempotencyStore.get(key);
    if (!entry || Date.now() > entry.expiresAt) { idempotencyStore.delete(key); return null; }
    return entry.result;
}

function setCached(key: string, result: object) {
    idempotencyStore.set(key, { result, expiresAt: Date.now() + 5 * 60 * 1_000 });
}

// ─────────────────────────────────────────────────────────────
// Map Cleanup — prevent memory leak on long-lived instances
// ─────────────────────────────────────────────────────────────
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        Array.from(rateStore.entries()).forEach(([k, v]) => {
            if (now - v.windowStart > RATE_WINDOW_MS * 10) rateStore.delete(k);
        });
        Array.from(idempotencyStore.entries()).forEach(([k, v]) => {
            if (now > v.expiresAt) idempotencyStore.delete(k);
        });
    }, 5 * 60_000);
}

// ─────────────────────────────────────────────────────────────
// Structured Logger
// ─────────────────────────────────────────────────────────────
function log(level: 'info' | 'warn' | 'error', event: string, context?: Record<string, unknown>) {
    const entry = { ts: new Date().toISOString(), level, event, ...context };
    if (level === 'error') console.error(JSON.stringify(entry));
    else if (level === 'warn') console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────
const TicketStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
const TicketPriority = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

const PostSchema = z.object({
    title: z.string().min(1, 'Title required').max(255),
    description: z.string().max(5000).optional(),
    status: TicketStatus.optional().default('OPEN'),
    priority: TicketPriority.optional().default('NORMAL'),
    idempotency_key: z.string().uuid().optional(), // optional client-provided key
});

const PatchSchema = z.object({
    id: z.string().uuid('Invalid ticket ID'),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    status: TicketStatus.optional(),
    priority: TicketPriority.optional(),
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function err(msg: string, status: number) {
    return NextResponse.json({ success: false, error: msg }, { status });
}

async function readJsonSafe(request: Request): Promise<unknown | null> {
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > MAX_BODY_BYTES) return null; // too large
    try { return await request.json(); } catch { return null; }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Gateway timeout')), ms)
        )
    ]);
}

// ─────────────────────────────────────────────────────────────
// GET: List tickets (cursor-based pagination)
// Query params: ?cursor=<base64(created_at)>&limit=<number>&status=<status>
// Cursor is base64url-encoded ISO timestamp — no DB lookup needed
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return err('Unauthorized', 401);

        if (isRateLimited(user.id)) {
            log('warn', 'rate_limit_exceeded', { userId: user.id, route: 'GET /api/tickets' });
            return err('Too Many Requests', 429);
        }

        const { searchParams } = new URL(request.url);
        const cursor = searchParams.get('cursor') ?? null;
        const limitParam = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '25', 10), 1), PAGE_LIMIT);
        const statusFilter = searchParams.get('status');

        // Validate status filter if provided
        if (statusFilter && !TicketStatus.options.includes(statusFilter as z.infer<typeof TicketStatus>)) {
            return err('Invalid status filter', 400);
        }

        const work = async () => {
            let query = supabase
                .from('tickets')
                .select(`
                    id, title, description, status, priority,
                    organization_id, created_at, updated_at,
                    creator:created_by(id, full_name, email),
                    assignee:assigned_to(id, full_name, email)
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(limitParam + 1); // +1 to detect if there's a next page

            if (statusFilter) query = query.eq('status', statusFilter);

            // Cursor: decode base64url timestamp, no extra DB query needed
            if (cursor) {
                const cursorDate = Buffer.from(cursor, 'base64url').toString('utf8');
                if (cursorDate) query = query.lt('created_at', cursorDate);
            }

            return query;
        };

        const { data, error } = await withTimeout(work(), REQUEST_TIMEOUT_MS);
        if (error) throw error;

        const hasNextPage = (data?.length ?? 0) > limitParam;
        const items = hasNextPage ? data!.slice(0, limitParam) : (data ?? []);
        // Encode last item's created_at as base64url — opaque cursor, no N+1 lookup
        const nextCursor = hasNextPage
            ? Buffer.from(items[items.length - 1].created_at).toString('base64url')
            : null;

        log('info', 'tickets_listed', { userId: user.id, count: items.length, cursor: cursor ?? 'start' });

        return NextResponse.json({
            success: true,
            data: items,
            pagination: { nextCursor, hasNextPage, limit: limitParam }
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        log('error', 'tickets_get_failed', { error: msg });
        return err('Internal server error', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// POST: Create ticket (Idempotent)
// ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return err('Unauthorized', 401);

        if (isRateLimited(user.id)) {
            log('warn', 'rate_limit_exceeded', { userId: user.id, route: 'POST /api/tickets' });
            return err('Too Many Requests', 429);
        }

        const raw = await readJsonSafe(request);
        if (!raw) return err('Payload too large or invalid JSON', 413);

        const parsed = PostSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { title, description, status, priority, idempotency_key } = parsed.data;

        // Idempotency Check
        const iKey = idempotency_key ?? null;
        if (iKey) {
            const cached = getCached(`${user.id}:${iKey}`);
            if (cached) {
                log('info', 'idempotency_hit', { userId: user.id, key: iKey });
                return NextResponse.json(cached);
            }
        }

        // Resolve org_id: first try app_metadata, then fall back to users table
        let orgId = user.app_metadata?.organization_id || user.user_metadata?.org_id;
        if (!orgId) {
            // Fallback: query organization_members table for this user's org
            const { data: membership } = await supabase
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();
            orgId = membership?.organization_id;
        }
        if (!orgId) {
            // Last resort: try users table
            const { data: userRow } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .maybeSingle();
            orgId = userRow?.organization_id;
        }
        if (!orgId) return err('No organization context. Please contact your administrator.', 403);

        const work = supabase
            .from('tickets')
            .insert({
                organization_id: orgId,
                created_by: user.id,
                title,
                description: description ?? null,
                status,
                priority,
            })
            .select()
            .single();

        const { data, error } = await withTimeout(work as unknown as Promise<any>, REQUEST_TIMEOUT_MS);

        if (error) {
            throw error;
        }


        const response = { success: true, data };

        // Also cache in-memory for same-instance fast path
        if (iKey) setCached(`${user.id}:${iKey}`, response);

        log('info', 'ticket_created', { userId: user.id, ticketId: data.id, orgId });
        return NextResponse.json(response, { status: 201 });

    } catch (error: any) {
        const msg = error?.message || 'Internal error';
        const details = error?.details || JSON.stringify(error);
        log('error', 'tickets_post_failed', { error: msg, details });
        return err(`DB Error: ${msg} - ${details}`, 500);
    }
}

// ─────────────────────────────────────────────────────────────
// PATCH: Update ticket
// ─────────────────────────────────────────────────────────────
export async function PATCH(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return err('Unauthorized', 401);

        if (isRateLimited(user.id)) {
            log('warn', 'rate_limit_exceeded', { userId: user.id, route: 'PATCH /api/tickets' });
            return err('Too Many Requests', 429);
        }

        const raw = await readJsonSafe(request);
        if (!raw) return err('Payload too large or invalid JSON', 413);

        const parsed = PatchSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { id, title, description, status, priority } = parsed.data;

        // Build safe partial update (no undefined → no NULL overwrites)
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;

        const work = supabase
            .from('tickets')
            .update(updates)
            .eq('id', id)
            .is('deleted_at', null) // never update soft-deleted rows
            .select()
            .single();

        const { data, error } = await withTimeout(work as unknown as Promise<any>, REQUEST_TIMEOUT_MS);

        if (error) {
            // Distinguish 404 (no rows matched RLS) from DB errors
            if (error.code === 'PGRST116') return err('Ticket not found or access denied', 404);
            throw error;
        }

        log('info', 'ticket_updated', { userId: user.id, ticketId: id });
        return NextResponse.json({ success: true, data });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        log('error', 'tickets_patch_failed', { error: msg });
        return err('Internal server error', 500);
    }
}

// ─────────────────────────────────────────────────────────────
// DELETE: Soft delete
// ─────────────────────────────────────────────────────────────
export async function DELETE(request: Request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return err('Unauthorized', 401);

        if (isRateLimited(user.id)) {
            log('warn', 'rate_limit_exceeded', { userId: user.id, route: 'DELETE /api/tickets' });
            return err('Too Many Requests', 429);
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id || !z.string().uuid().safeParse(id).success) {
            return err('Valid ticket ID required', 400);
        }

        // Direct await (Supabase builder is thenable — no Promise.race wrapping needed here)
        const { data: deleted, error } = await supabase
            .from('tickets')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .is('deleted_at', null)
            .select('id');
        if (error) throw error;

        // No rows updated = ticket not found or RLS blocked = silent no-op prevented
        if (!deleted || deleted.length === 0) {
            return err('Ticket not found or already deleted', 404);
        }

        log('info', 'ticket_deleted', { userId: user.id, ticketId: id });
        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Internal error';
        log('error', 'tickets_delete_failed', { error: msg });
        return err('Internal server error', 500);
    }
}
