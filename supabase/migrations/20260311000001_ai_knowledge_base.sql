-- EnviroJim AI Knowledge Core - Secondary Migration
-- Extends existing Machine Enterprise schema

-- Adjust dimensionality for text-embedding-004 (768)
ALTER TABLE public.document_embeddings ALTER COLUMN embedding TYPE vector(768);

-- 1. error_codes (Global Knowledge)
CREATE TABLE IF NOT EXISTS public.error_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    recommended_action TEXT,
    manufacturer TEXT,
    machine_model TEXT, -- Optional filter
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. repair_knowledge_base
CREATE TABLE IF NOT EXISTS public.repair_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL, -- Null if generic pattern
    component TEXT NOT NULL,
    symptom_pattern TEXT NOT NULL,
    failure_mode TEXT NOT NULL,
    solution TEXT NOT NULL,
    parts_used JSONB DEFAULT '[]',
    confidence_score FLOAT DEFAULT 1.0,
    occurrence_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. repair_embeddings (Vector search for symptoms/failure/solution)
CREATE TABLE IF NOT EXISTS public.repair_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_id UUID NOT NULL REFERENCES public.repair_knowledge_base(id) ON DELETE CASCADE,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. fleet_failure_patterns
CREATE TABLE IF NOT EXISTS public.fleet_failure_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component TEXT NOT NULL,
    failure_mode TEXT NOT NULL,
    machine_models TEXT[], -- Array of affected models
    occurrence_count INTEGER DEFAULT 1,
    risk_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.error_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_failure_patterns ENABLE ROW LEVEL SECURITY;

-- Policies (consistent with organization insulation)
CREATE POLICY "Users can access all Error Codes" 
ON public.error_codes FOR SELECT USING (true);

CREATE POLICY "Users can access their organization's Repair KB" 
ON public.repair_knowledge_base FOR ALL USING (
    organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's Repair Embeddings" 
ON public.repair_embeddings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.repair_knowledge_base kb
        WHERE kb.id = public.repair_embeddings.knowledge_id
        AND (kb.organization_id IS NULL OR kb.organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        ))
    )
);

CREATE POLICY "Fleet patterns are viewable by all authorized staff" 
ON public.fleet_failure_patterns FOR SELECT USING (true);

-- RPC for Repair KB Vector Search
CREATE OR REPLACE FUNCTION match_repairs (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  knowledge_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    repair_embeddings.id,
    repair_embeddings.knowledge_id,
    1 - (repair_embeddings.embedding <=> query_embedding) AS similarity
  FROM repair_embeddings
  JOIN repair_knowledge_base ON repair_knowledge_base.id = repair_embeddings.knowledge_id
  WHERE (repair_knowledge_base.organization_id = p_organization_id OR repair_knowledge_base.organization_id IS NULL)
    AND 1 - (repair_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY repair_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;
