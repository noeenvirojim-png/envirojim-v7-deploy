/**
 * aiCoreClient — Supabase client scoped to the ai_core schema.
 * All AI Core services (v5) use this client.
 * Legacy app queries use the standard public-schema client from @/lib/supabase/server.
 */

import { createServerClient } from '@supabase/ssr';

export function createAiCoreClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const dbOptions = { db: { schema: 'ai_core' as const } };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require('next/headers');
    const cookieStore = cookies();
    return createServerClient(url, key, {
      ...dbOptions,
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch { /* outside request context */ }
          });
        },
      },
    });
  } catch {
    // CLI / vitest / background tasks — no cookie store available
    return createServerClient(url, key, {
      ...dbOptions,
      cookies: { getAll: () => [], setAll: () => {} },
    });
  }
}
