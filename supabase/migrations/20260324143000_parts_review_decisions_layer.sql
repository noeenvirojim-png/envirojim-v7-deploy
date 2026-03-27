begin;

create table if not exists public.parts_review_decisions (
  id uuid primary key default gen_random_uuid(),
  extraction_row_id uuid not null references public.parts_extraction_rows(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision_status text not null check (decision_status in ('APPROVED','CORRECTED','REJECTED','ESCALATED')),
  corrected_part_number text null,
  corrected_designation text null,
  corrected_qty numeric null,
  corrected_notes text null,
  rationale text null,
  decided_by uuid null,
  decided_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_parts_review_decisions_row
  on public.parts_review_decisions (extraction_row_id);

create index if not exists idx_parts_review_decisions_machine
  on public.parts_review_decisions (machine_id);

create unique index if not exists uq_parts_review_decisions_active_row
  on public.parts_review_decisions (extraction_row_id)
  where is_active = true;

alter table public.parts_review_decisions enable row level security;
alter table public.parts_review_decisions force row level security;

create policy if not exists parts_review_decisions_select_policy
on public.parts_review_decisions
for select
using (
  machine_id in (
    select m.id
    from public.machines m
    where m.owner_org_id = current_setting('app.current_org_id', true)::uuid
  )
);

create policy if not exists parts_review_decisions_insert_policy
on public.parts_review_decisions
for insert
with check (
  machine_id in (
    select m.id
    from public.machines m
    where m.owner_org_id = current_setting('app.current_org_id', true)::uuid
  )
);

create policy if not exists parts_review_decisions_update_policy
on public.parts_review_decisions
for update
using (
  machine_id in (
    select m.id
    from public.machines m
    where m.owner_org_id = current_setting('app.current_org_id', true)::uuid
  )
)
with check (
  machine_id in (
    select m.id
    from public.machines m
    where m.owner_org_id = current_setting('app.current_org_id', true)::uuid
  )
);

commit;
