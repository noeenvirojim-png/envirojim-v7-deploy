-- BLOC G: Parts Extraction Audit Layer Migration
-- Additive-only migration for parts truth layer persistence

-- 1) audit runs table
create table if not exists public.parts_extraction_audit_runs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  source_document_path text not null,
  source_document_name text not null,
  source_document_sha256 text,
  source_page_count integer,
  run_status text not null check (run_status in ('STARTED','COMPLETED','FAILED')),
  table_pages_count integer,
  diagram_pages_count integer,
  mixed_pages_count integer,
  unreadable_pages_count integer,
  total_rows_extracted integer,
  validated_rows_count integer,
  needs_review_rows_count integer,
  rejected_rows_count integer,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_parts_extraction_audit_runs_machine_id
  on public.parts_extraction_audit_runs(machine_id);

-- 2) extraction rows table
create table if not exists public.parts_extraction_rows (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid not null references public.parts_extraction_audit_runs(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  source_document_name text not null,
  source_page integer not null,
  row_fingerprint text not null,
  callout text,
  part_number_raw text,
  part_number_normalized text,
  designation_raw text,
  qty text,
  notes text,
  evidence_snippet text not null,
  validation_status text not null check (validation_status in ('VALIDATED','NEEDS_REVIEW','REJECTED')),
  decision_reason text,
  extracted_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_parts_extraction_rows_run_fp
  on public.parts_extraction_rows(audit_run_id, row_fingerprint);

create index if not exists idx_parts_extraction_rows_machine_status
  on public.parts_extraction_rows(machine_id, validation_status);

create index if not exists idx_parts_extraction_rows_page
  on public.parts_extraction_rows(machine_id, source_document_name, source_page);

-- 3) optional decision trail
create table if not exists public.parts_review_decisions (
  id uuid primary key default gen_random_uuid(),
  extraction_row_id uuid not null references public.parts_extraction_rows(id) on delete cascade,
  previous_status text not null,
  new_status text not null,
  decision_reason text not null,
  decided_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_parts_review_decisions_row
  on public.parts_review_decisions(extraction_row_id);

-- 4) Enable RLS with machine isolation (align with existing pattern)
alter table public.parts_extraction_audit_runs enable row level security;
alter table public.parts_extraction_rows enable row level security;
alter table public.parts_review_decisions enable row level security;

alter table public.parts_extraction_audit_runs force row level security;
alter table public.parts_extraction_rows force row level security;
alter table public.parts_review_decisions force row level security;

-- RLS Policies for parts_extraction_audit_runs (machine-scoped)
create policy "Enable read access for machine owner" on public.parts_extraction_audit_runs
  for select using (
    machine_id = auth.uid() OR
    exists (
      select 1 from public.machines m
      where m.id = machine_id AND m.owner_org_id = auth.jwt() ->> 'org_id'
    )
  );

create policy "Enable insert for authenticated" on public.parts_extraction_audit_runs
  for insert with check (
    machine_id = auth.uid() OR
    exists (
      select 1 from public.machines m
      where m.id = machine_id AND m.owner_org_id = auth.jwt() ->> 'org_id'
    )
  );

-- RLS Policies for parts_extraction_rows (machine-scoped)
create policy "Enable read access for machine owner" on public.parts_extraction_rows
  for select using (
    machine_id = auth.uid() OR
    exists (
      select 1 from public.machines m
      where m.id = machine_id AND m.owner_org_id = auth.jwt() ->> 'org_id'
    )
  );

create policy "Enable insert for authenticated" on public.parts_extraction_rows
  for insert with check (
    machine_id = auth.uid() OR
    exists (
      select 1 from public.machines m
      where m.id = machine_id AND m.owner_org_id = auth.jwt() ->> 'org_id'
    )
  );

-- RLS Policies for parts_review_decisions (via extraction_row_id access)
create policy "Enable read access via row access" on public.parts_review_decisions
  for select using (
    exists (
      select 1 from public.parts_extraction_rows per
      where per.id = extraction_row_id AND (
        per.machine_id = auth.uid() OR
        exists (
          select 1 from public.machines m
          where m.id = per.machine_id AND m.owner_org_id = auth.jwt() ->> 'org_id'
        )
      )
    )
  );

create policy "Enable insert via row access" on public.parts_review_decisions
  for insert with check (
    exists (
      select 1 from public.parts_extraction_rows per
      where per.id = extraction_row_id AND (
        per.machine_id = auth.uid() OR
        exists (
          select 1 from public.machines m
          where m.id = per.machine_id AND m.owner_org_id = auth.jwt() ->> 'org_id'
        )
      )
    )
  );
