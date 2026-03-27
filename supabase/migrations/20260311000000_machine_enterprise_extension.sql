-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 1. machine_compatible_parts
CREATE TABLE IF NOT EXISTS public.machine_compatible_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES public.machine_documents(id) ON DELETE SET NULL,
    confidence_score FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. machine_parts_used
CREATE TABLE IF NOT EXISTS public.machine_parts_used (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    installed_at TIMESTAMPTZ,
    installed_hours NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. document_embeddings
CREATE TABLE IF NOT EXISTS public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.machine_documents(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding vector(1536),
    page_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. machine_extracted_data
CREATE TABLE IF NOT EXISTS public.machine_extracted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.machine_documents(id) ON DELETE SET NULL,
    extracted_json JSONB NOT NULL,
    confidence FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. maintenance_rules
CREATE TABLE IF NOT EXISTS public.maintenance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_model TEXT NOT NULL,
    interval_hours NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.machine_compatible_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_rules ENABLE ROW LEVEL SECURITY;

-- Modernized RLS Policies (Modern names)
CREATE POLICY "Users can access their organization's Compatible Parts" 
ON public.machine_compatible_parts FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can access their organization's Used Parts" 
ON public.machine_parts_used FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can access their organization's Embeddings" 
ON public.document_embeddings FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can access their organization's Extracted Data" 
ON public.machine_extracted_data FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "Users can access their organization's Maintenance Rules" 
ON public.maintenance_rules FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
);

-- RPC for RAG Vector Search
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_machine_id uuid
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    document_embeddings.id,
    document_embeddings.document_id,
    document_embeddings.content_chunk,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE document_embeddings.machine_id = p_machine_id
    AND 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;
