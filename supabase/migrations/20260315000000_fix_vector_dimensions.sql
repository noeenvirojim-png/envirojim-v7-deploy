-- ENVIROJIM V7.2 - AI RELIABILITY PATCH
-- Goal: Fix vector dimension mismatch (1536 -> 768) for Gemini text-embedding-004/001 compatibility.

-- 1. Fix Table Columns
ALTER TABLE public.document_embeddings ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE public.repair_embeddings ALTER COLUMN embedding TYPE vector(768);

-- 2. Update match_documents RPC
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
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

-- 3. Update match_repairs RPC
CREATE OR REPLACE FUNCTION match_repairs (
  query_embedding vector(768),
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
