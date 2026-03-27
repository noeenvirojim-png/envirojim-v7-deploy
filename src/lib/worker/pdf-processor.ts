import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
const pdfParse = require('pdf-parse');
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// AI Extraction Contract — Strict JSON schema
// ─────────────────────────────────────────────────────────────
const MachineExtractionSchema = z.object({
    serial_number: z.string().min(1, 'serial_number is required'),
    manufacturer: z.string().nullable(),
    model: z.string().nullable(),
    voltage: z.string().nullable(),
    year: z.string().nullable(),
    confidence: z.number().min(0).max(1),
});

type MachineExtraction = z.infer<typeof MachineExtractionSchema>;

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const MAX_CONCURRENT_JOBS = 5;
const MIN_CONFIDENCE = 0.6;
const AI_MODEL = 'gemini-1.5-flash';

const AI_PROMPT = `You are a machine data extractor. Analyze the following text from a machine manual or specification sheet.

Extract exactly these fields and respond ONLY with valid JSON, nothing else:
{
  "serial_number": "exact serial number found, REQUIRED",
  "manufacturer": "manufacturer/brand name or null",
  "model": "model name/number or null",
  "voltage": "voltage specification (e.g. '220V', '110/220V') or null",
  "year": "year of manufacture or null",
  "confidence": 0.0 to 1.0 (your confidence in the extraction accuracy)
}

Rules:
- If no serial number can be found, set confidence below 0.6
- Only extract information that is clearly stated in the text
- Do not guess or infer values
- Respond with ONLY the JSON object, no markdown, no explanation

PDF TEXT:
`;

function log(level: 'info' | 'warn' | 'error', event: string, ctx?: Record<string, unknown>) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        JSON.stringify({ ts: new Date().toISOString(), level, event, ...ctx })
    );
}

// Service role client — bypasses RLS for worker operations
// NEVER exposed to frontend
function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) throw new Error('Supabase service role config missing');
    return createServiceClient(url, serviceKey);
}

// ─────────────────────────────────────────────────────────────
// Step 1: Claim next job atomically (FOR UPDATE SKIP LOCKED)
// ─────────────────────────────────────────────────────────────
async function claimJob(serviceClient: ReturnType<typeof getServiceClient>) {
    const { data, error } = await serviceClient.rpc('claim_next_pdf_job');
    if (error) throw new Error(`claim_next_pdf_job failed: ${error.message}`);
    return data?.[0] ?? null;
}

// ─────────────────────────────────────────────────────────────
// Step 2: Download PDF bytes from private storage
// ─────────────────────────────────────────────────────────────
async function downloadPdf(
    serviceClient: ReturnType<typeof getServiceClient>,
    filePath: string
): Promise<Buffer> {
    const { data, error } = await serviceClient.storage
        .from('pdf-uploads')
        .download(filePath);

    if (error || !data) throw new Error(`PDF download failed: ${error?.message}`);

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// ─────────────────────────────────────────────────────────────
// Step 3: Extract text from PDF bytes
// ─────────────────────────────────────────────────────────────
async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
    const result = await pdfParse(pdfBuffer, { max: 10 }); // max 10 pages
    const text = result.text?.trim();
    if (!text || text.length < 20) throw new Error('PDF text extraction returned empty or insufficient content');
    // Limit to ~4000 chars to avoid AI token overflow
    return text.slice(0, 4000);
}

// ─────────────────────────────────────────────────────────────
// Step 4: Call Gemini AI for extraction
// ─────────────────────────────────────────────────────────────
async function callAI(pdfText: string): Promise<{ raw: string; parsed: MachineExtraction }> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: AI_MODEL });

    const result = await model.generateContent(AI_PROMPT + pdfText);
    const raw = result.response.text().trim();

    // Strip markdown code fences if AI adds them
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error(`AI returned non-JSON response: ${raw.slice(0, 200)}`);
    }

    const validated = MachineExtractionSchema.safeParse(parsed);
    if (!validated.success) {
        throw new Error(`AI response failed schema validation: ${JSON.stringify(validated.error.flatten())}`);
    }

    return { raw, parsed: validated.data };
}

// ─────────────────────────────────────────────────────────────
// Step 5: Insert machine (idempotent — UNIQUE on serial_number + org)
// ─────────────────────────────────────────────────────────────
async function upsertMachine(
    serviceClient: ReturnType<typeof getServiceClient>,
    extraction: MachineExtraction,
    job: { id: string; organization_id: string }
): Promise<string> {
    const { data, error } = await serviceClient
        .from('machines')
        .upsert({
            organization_id: job.organization_id,
            serial_number: extraction.serial_number,
            manufacturer: extraction.manufacturer,
            model: extraction.model,
            voltage: extraction.voltage,
            year: extraction.year,
            confidence: extraction.confidence,  // FIX 5: persist confidence
            source_job_id: job.id,
        }, {
            onConflict: 'organization_id,serial_number',
            ignoreDuplicates: false,
        })
        .select('id')
        .single();

    if (error) throw new Error(`Machine upsert failed: ${error.message}`);
    return data.id;
}

// ─────────────────────────────────────────────────────────────
// Step 6: Mark job terminal state
// ─────────────────────────────────────────────────────────────
async function resolveJob(
    serviceClient: ReturnType<typeof getServiceClient>,
    jobId: string,
    status: 'DONE' | 'FAILED',
    opts: { machineId?: string; rawAiOutput?: unknown; error?: string }
) {
    await serviceClient
        .from('pdf_jobs')
        .update({
            status,
            machine_id: opts.machineId ?? null,
            raw_ai_output: opts.rawAiOutput ?? null,
            last_error: opts.error ?? null,
            processed_at: new Date().toISOString(),
        })
        .eq('id', jobId);
}

// ─────────────────────────────────────────────────────────────
// Process a single job — full pipeline
// ─────────────────────────────────────────────────────────────
async function processJob(job: Record<string, unknown>) {
    const serviceClient = getServiceClient();
    const jobId = job.id as string;
    const filePath = job.file_path as string;

    log('info', 'job_start', { jobId, filePath, attempt: job.attempts });

    try {
        const pdfBuffer = await downloadPdf(serviceClient, filePath);
        const pdfText = await extractPdfText(pdfBuffer);
        const { raw, parsed } = await callAI(pdfText);

        if (parsed.confidence < MIN_CONFIDENCE) {
            throw new Error(`AI confidence too low: ${parsed.confidence} (min ${MIN_CONFIDENCE}). serial_number may be missing.`);
        }

        const machineId = await upsertMachine(serviceClient, parsed, {
            id: jobId,
            organization_id: job.organization_id as string,
        });

        await resolveJob(serviceClient, jobId, 'DONE', { machineId, rawAiOutput: JSON.parse(raw) });

        log('info', 'job_done', { jobId, machineId, serialNumber: parsed.serial_number });
        return { jobId, status: 'DONE', machineId };

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const attempts = (job.attempts as number) ?? 0;

        // After 3 attempts → permanently FAILED, no more retries
        const finalStatus = attempts >= 3 ? 'FAILED' : 'PENDING';

        if (finalStatus === 'FAILED') {
            await resolveJob(serviceClient, jobId, 'FAILED', { error: msg });
        } else {
            // Reset to PENDING for retry (worker will pick up again on next run)
            await serviceClient.from('pdf_jobs').update({
                status: 'PENDING',
                last_error: msg,
            }).eq('id', jobId);
        }

        log('error', 'job_failed', { jobId, error: msg, attempts, finalStatus });
        return { jobId, status: finalStatus, error: msg };
    }
}

// ─────────────────────────────────────────────────────────────
// Main: Run up to MAX_CONCURRENT_JOBS in parallel
// Called by Vercel Cron route every minute
// ─────────────────────────────────────────────────────────────
export async function runWorkerBatch(): Promise<{
    processed: number;
    results: Array<{ jobId: string; status: string; error?: string }>;
}> {
    const serviceClient = getServiceClient();

    // FIX 4: Reset FAILED jobs eligible for retry before claiming new ones
    // Idempotent — safe to run every batch cycle
    await serviceClient.rpc('reset_retryable_jobs').then(({ error }) => {
        if (error) log('warn', 'retry_reset_failed', { error: error.message });
        else log('info', 'retry_reset_ok', {});
    });

    const jobs: Record<string, unknown>[] = [];

    // Claim up to MAX_CONCURRENT_JOBS atomically
    for (let i = 0; i < MAX_CONCURRENT_JOBS; i++) {
        const job = await claimJob(serviceClient);
        if (!job) break; // no more pending jobs
        jobs.push(job);
    }

    if (jobs.length === 0) {
        log('info', 'worker_no_jobs', {});
        return { processed: 0, results: [] };
    }

    log('info', 'worker_batch_start', { count: jobs.length });

    // Process all claimed jobs in parallel
    const results = await Promise.allSettled(jobs.map(processJob));

    const output = results.map((r, i) =>
        r.status === 'fulfilled'
            ? r.value
            : { jobId: jobs[i].id as string, status: 'ERROR', error: String(r.reason) }
    );

    log('info', 'worker_batch_done', { count: jobs.length, results: output });
    return { processed: jobs.length, results: output };
}
