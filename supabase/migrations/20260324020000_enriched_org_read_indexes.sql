-- Enriched org read isolation indexes
begin;

create index if not exists idx_internal_tickets_machine_id
  on public.internal_tickets (machine_id);

create index if not exists idx_work_orders_machine_id
  on public.work_orders (machine_id);

create index if not exists idx_part_orders_machine_id
  on public.part_orders (machine_id);

create index if not exists idx_machines_owner_org_id
  on public.machines (owner_org_id);

commit;
