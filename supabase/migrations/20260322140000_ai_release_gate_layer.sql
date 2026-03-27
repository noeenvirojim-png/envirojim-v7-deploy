begin;

create table if not exists public.ai_release_gate_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ai_delivery_run_id uuid not null,
  ai_delivery_quality_run_id uuid null,
  ai_semantic_validation_run_id uuid null,
  gate_status text not null check (gate_status in ('PASS', 'FAIL')),
  summary jsonb not null default '{}'::jsonb,
  created_by_script text not null default 'scripts/build-ai-release-gate-report.ts'
);

create index if not exists idx_ai_release_gate_runs_delivery_run
  on public.ai_release_gate_runs (ai_delivery_run_id, created_at desc);

create table if not exists public.ai_release_gate_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ai_release_gate_run_id uuid not null references public.ai_release_gate_runs(id) on delete cascade,
  check_key text not null,
  severity text not null check (severity in ('ERROR', 'WARN', 'INFO')),
  passed boolean not null,
  actual_value jsonb null,
  expected_value jsonb null,
  details text null
);

create index if not exists idx_ai_release_gate_checks_run
  on public.ai_release_gate_checks (ai_release_gate_run_id);

commit;
