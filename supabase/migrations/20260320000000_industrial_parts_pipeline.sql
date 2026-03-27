-- GATE 6 — INDUSTRIAL PARTS PIPELINE
-- Migration: 20260320000000_industrial_parts_pipeline.sql

-- 1. RAW DOCUMENTS
CREATE TABLE IF NOT EXISTS machine_documents_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    document_type TEXT,
    raw_text TEXT,
    page_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CANDIDATES (Multi-source)
CREATE TABLE IF NOT EXISTS machine_parts_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES machine_documents_raw(id),
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    system TEXT,
    source_method TEXT NOT NULL, -- AI_A | AI_B | PARSER | REGEX
    snippet TEXT,
    page TEXT,
    confidence TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. VALIDATED (Consensus)
CREATE TABLE IF NOT EXISTS machine_parts_validated (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    system TEXT,
    evidence_count INTEGER DEFAULT 1,
    sources_count INTEGER DEFAULT 1,
    validation_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ambiguous', -- validated | ambiguous | conflicting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CANONICAL (Gold Standard)
CREATE TABLE IF NOT EXISTS machine_parts_canonical (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number TEXT NOT NULL,
    name TEXT NOT NULL,
    system TEXT,
    is_complete BOOLEAN DEFAULT FALSE,
    coverage_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. COVERAGE REPORT
CREATE TABLE IF NOT EXISTS machine_parts_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES machine_documents_raw(id),
    expected_count INTEGER DEFAULT 0,
    extracted_count INTEGER DEFAULT 0,
    validated_count INTEGER DEFAULT 0,
    canonical_count INTEGER DEFAULT 0,
    missing_count INTEGER DEFAULT 0,
    conflict_count INTEGER DEFAULT 0,
    coverage_percent NUMERIC(5,2) DEFAULT 0.00,
    is_blocking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
