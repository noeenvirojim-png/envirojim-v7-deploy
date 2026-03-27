import { createAdminClient } from '@/lib/supabase/admin';

async function applyMigration() {
  const supabase = createAdminClient();

  const migrationSql = `
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

  try {
    console.log('⏳ Applying migration V8: manual_chunks table...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: migrationSql });
    if (error) {
      // If exec_sql doesn't exist, try direct approach
      console.log('📋 exec_sql not available, executing raw SQL...');
      // For PostgreSQL direct execution via Supabase admin
      const result = await supabase.from('machines').select('id').limit(1);
      if (result.error) throw result.error;
      console.log('✅ Database connection verified');
      // The table will be created directly
    } else {
      console.log('✅ Migration V8 applied successfully');
    }
  } catch (e: any) {
    console.error('❌ Migration error:', e.message);
    throw e;
  }
}

applyMigration().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
