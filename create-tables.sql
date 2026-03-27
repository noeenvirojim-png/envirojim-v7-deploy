-- Create public.parts table
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  canonical_part_number text not null,
  raw_part_number text,
  name text not null,
  source_confidence numeric(3,2) default 0.75,
  source_refs jsonb default '{}'::jsonb,
  aliases jsonb default '[]'::jsonb,
  compatible_variants jsonb default '[]'::jsonb,
  criticality text default 'normal',
  consumable boolean default false,
  maintenance_related boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(machine_id, canonical_part_number)
);

-- Create public.part_orders table
create table if not exists public.part_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  machine_id uuid not null references public.machines(id) on delete cascade,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create public.part_order_items table
create table if not exists public.part_order_items (
  id uuid primary key default gen_random_uuid(),
  part_order_id uuid not null references public.part_orders(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  part_number text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2),
  urgency text default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index if not exists idx_parts_machine_id on public.parts(machine_id);
create index if not exists idx_part_orders_machine_id on public.part_orders(machine_id);
create index if not exists idx_part_order_items_order_id on public.part_order_items(part_order_id);
