-- 🛠️ ENVIROJIM V8: AI VECTOR INFRASTRUCTURE
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.manual_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(768), -- Gemini 768d embeddings
    page_number INTEGER,
    section_title TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding ON public.manual_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE public.manual_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manual_chunks_isolation" ON public.manual_chunks
    USING ( organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()) );
