-- Enable native RLS on enriched tables to enforce org isolation
begin;

-- INTERNAL_TICKETS: Enable RLS with FORCE to prevent owner bypass
alter table public.internal_tickets enable row level security;
alter table public.internal_tickets force row level security;

create policy "org_isolation_select_internal_tickets"
  on public.internal_tickets
  for select
  using (
    machine_id in (
      select id from public.machines where owner_org_id = current_setting('app.current_org_id', true)::uuid
    )
  );

create policy "service_insert_internal_tickets"
  on public.internal_tickets
  for insert
  with check (true);

-- WORK_ORDERS: Enable RLS with FORCE to prevent owner bypass
alter table public.work_orders enable row level security;
alter table public.work_orders force row level security;

create policy "org_isolation_select_work_orders"
  on public.work_orders
  for select
  using (
    machine_id in (
      select id from public.machines where owner_org_id = current_setting('app.current_org_id', true)::uuid
    )
  );

create policy "service_insert_work_orders"
  on public.work_orders
  for insert
  with check (true);

-- PART_ORDERS: Enable RLS with FORCE to prevent owner bypass
alter table public.part_orders enable row level security;
alter table public.part_orders force row level security;

create policy "org_isolation_select_part_orders"
  on public.part_orders
  for select
  using (
    machine_id in (
      select id from public.machines where owner_org_id = current_setting('app.current_org_id', true)::uuid
    )
  );

create policy "service_insert_part_orders"
  on public.part_orders
  for insert
  with check (true);

commit;
