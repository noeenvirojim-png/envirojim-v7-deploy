BEGIN;

-- Additive tables for parts extraction audit and review queue
-- NO breaking changes to existing schema

create table if not exists public.parts_extraction_audit_runs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  source_document_path text not null,
  source_document_name text not null,
  extractor_version text not null default 'parts-truth-v1',
  status text not null check (status in ('RUNNING','COMPLETED','FAILED')),
  total_pages integer,
  pages_touched integer,
  pages_with_parts_rows integer,
  pages_with_zero_output integer,
  rows_total integer not null default 0,
  validated_rows integer not null default 0,
  needs_review_rows integer not null default 0,
  rejected_rows integer not null default 0,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.parts_extraction_rows (
  id uuid primary key default gen_random_uuid(),
  audit_run_id uuid not null references public.parts_extraction_audit_runs(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  source_document_path text not null,
  source_document_name text not null,
  source_page integer not null,
  row_index integer not null,
  callout text,
  part_number_raw text,
  part_number_normalized text,
  designation_raw text,
  qty text,
  notes text,
  evidence_snippet text,
  validation_status text not null check (validation_status in ('VALIDATED','NEEDS_REVIEW','REJECTED')),
  review_reason text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for query performance
create index if not exists idx_parts_extraction_audit_runs_machine_id
  on public.parts_extraction_audit_runs(machine_id, created_at desc);

create index if not exists idx_parts_extraction_rows_audit_run_id
  on public.parts_extraction_rows(audit_run_id, source_page, row_index);

create index if not exists idx_parts_extraction_rows_machine_id
  on public.parts_extraction_rows(machine_id, validation_status, source_page);

-- Enable and enforce RLS for multi-tenant safety
alter table public.parts_extraction_audit_runs enable row level security;
alter table public.parts_extraction_rows enable row level security;

alter table public.parts_extraction_audit_runs force row level security;
alter table public.parts_extraction_rows force row level security;

-- RLS policies: select only via machine ownership
drop policy if exists parts_extraction_audit_runs_select_by_org on public.parts_extraction_audit_runs;
create policy parts_extraction_audit_runs_select_by_org
on public.parts_extraction_audit_runs
for select
using (
  machine_id in (
    select m.id
    from public.machines m
    where m.owner_org_id = current_setting('app.current_org_id', true)::uuid
  )
);

drop policy if exists parts_extraction_rows_select_by_org on public.parts_extraction_rows;
create policy parts_extraction_rows_select_by_org
on public.parts_extraction_rows
for select
using (
  machine_id in (
    select m.id
    from public.machines m
    where m.owner_org_id = current_setting('app.current_org_id', true)::uuid
  )
);

COMMIT;
