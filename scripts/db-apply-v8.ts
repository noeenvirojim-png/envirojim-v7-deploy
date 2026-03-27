import { createAdminClient } from '@/lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();

  const sql = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.manual_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(768),
    page_number INTEGER,
    section_title TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding ON public.manual_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.manual_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manual_chunks_isolation" ON public.manual_chunks
    USING ( organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) );
  `;

  console.log('📝 Executing V8 migration...');
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error('❌ RPC Error:', error);
      process.exit(1);
    }
    console.log('✅ V8 migration applied');
  } catch (e: any) {
    console.error('❌ Fatal:', e.message);
    process.exit(1);
  }
}

main();
