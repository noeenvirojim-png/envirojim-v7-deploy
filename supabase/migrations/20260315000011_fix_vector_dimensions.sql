-- ENVIROJIM - FIX VECTOR DIMENSIONS
-- Adjust dimensionality for text-embedding-004 (768)
-- Version: 20260315000011 (Unique)

ALTER TABLE public.document_embeddings ALTER COLUMN embedding TYPE vector(768);
