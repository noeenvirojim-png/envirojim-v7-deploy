-- Canonical Graph Schema (Additive)
-- Separate canonical clustering from raw entity extraction
-- READ-ONLY on source tables, purely additive
-- All writes are reversible (no cascade deletes on source)

-- === CANONICAL CLUSTERS TABLE ===
CREATE TABLE IF NOT EXISTS canonical_clusters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  machine_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  cluster_type TEXT NOT NULL
    CHECK (cluster_type IN ('system', 'component', 'part', 'maintenance_target', 'fault_target')),
  confidence TEXT NOT NULL
    CHECK (confidence IN ('low', 'medium', 'high')),
  source_entity_count INTEGER DEFAULT 0,
  source_doc_count INTEGER DEFAULT 0,
  merge_rationale TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT canonical_clusters_unique_per_machine
    UNIQUE(machine_id, canonical_name, cluster_type)
);

CREATE INDEX idx_canonical_clusters_machine ON canonical_clusters(machine_id);
CREATE INDEX idx_canonical_clusters_type ON canonical_clusters(cluster_type);


-- === CANONICAL CLUSTER ALIASES TABLE ===
CREATE TABLE IF NOT EXISTS canonical_cluster_aliases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cluster_id TEXT NOT NULL REFERENCES canonical_clusters(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language_or_variant TEXT,
  source_entity_id TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_aliases_cluster ON canonical_cluster_aliases(cluster_id);
CREATE INDEX idx_aliases_text ON canonical_cluster_aliases(alias);


-- === CANONICAL CLUSTER MEMBERS TABLE ===
CREATE TABLE IF NOT EXISTS canonical_cluster_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cluster_id TEXT NOT NULL REFERENCES canonical_clusters(id) ON DELETE CASCADE,
  source_entity_id TEXT NOT NULL,
  source_entity_type TEXT NOT NULL
    CHECK (source_entity_type IN ('part', 'procedure', 'maintenance_task', 'fault_case', 'system')),
  source_entity_name TEXT,
  evidence_count INTEGER DEFAULT 0,
  confidence TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_members_cluster ON canonical_cluster_members(cluster_id);
CREATE INDEX idx_members_entity ON canonical_cluster_members(source_entity_id);


-- === CANONICAL CLUSTER LINKS TABLE ===
CREATE TABLE IF NOT EXISTS canonical_cluster_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  from_cluster_id TEXT NOT NULL REFERENCES canonical_clusters(id) ON DELETE CASCADE,
  to_cluster_id TEXT NOT NULL REFERENCES canonical_clusters(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL
    CHECK (link_type IN ('part_of', 'references', 'caused_by', 'used_in', 'linked_via_maintenance')),
  confidence TEXT DEFAULT 'medium'
    CHECK (confidence IN ('low', 'medium', 'high')),
  source_evidence TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_links_from ON canonical_cluster_links(from_cluster_id);
CREATE INDEX idx_links_to ON canonical_cluster_links(to_cluster_id);
CREATE UNIQUE INDEX idx_links_unique ON canonical_cluster_links(from_cluster_id, to_cluster_id, link_type);


-- === AUDIT: FUSION RUN LOG ===
CREATE TABLE IF NOT EXISTS canonical_fusion_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  machine_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  source_entity_count INTEGER,
  source_document_count INTEGER,
  canonical_cluster_count INTEGER,
  aliases_created INTEGER,
  members_created INTEGER,
  links_created INTEGER,
  status TEXT DEFAULT 'completed',
  run_timestamp TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_fusion_runs_machine ON canonical_fusion_runs(machine_id);
