-- ENVIROJIM PHASE 8 - ENRICHED WRITES TABLES
-- Minimal additive migration for real enriched DB write proof
-- Compatible with execute-real-enriched-writes.ts

begin;

create table if not exists public.internal_tickets (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  title text null,
  description text null,
  severity text null,
  confidence numeric null,
  source text null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  title text null,
  description text null,
  priority text null,
  status text null,
  estimated_hours numeric null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_order_steps (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  step_number numeric null,
  description text null,
  completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.part_orders (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  org_id text null,
  part_number text null,
  part_name text null,
  quantity numeric null,
  urgency text null,
  estimated_unit_cost numeric null,
  estimated_lead_time_days numeric null,
  safety_critical boolean null,
  source text null,
  metadata jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_internal_tickets_machine_id on public.internal_tickets(machine_id);
create index if not exists idx_work_orders_machine_id on public.work_orders(machine_id);
create index if not exists idx_work_order_steps_work_order_id on public.work_order_steps(work_order_id);
create index if not exists idx_part_orders_machine_id on public.part_orders(machine_id);
create index if not exists idx_part_orders_org_id on public.part_orders(org_id);

commit;
