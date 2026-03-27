-- Add status and source columns for enriched read paths proof
begin;

alter table if exists public.internal_tickets
add column if not exists status text default 'OPEN';

alter table if exists public.work_orders
add column if not exists status text default 'OPEN',
add column if not exists source text null;

alter table if exists public.part_orders
add column if not exists status text default 'PENDING';

commit;
