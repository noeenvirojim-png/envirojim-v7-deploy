#!/bin/bash
# DB RECOVERY RUNBOOK - VB750 LOCAL SUPABASE
# Ultra-fast path to repair incomplete local schema
# Max time: 5 minutes

set -e

echo "[DB RECOVERY] Starting..."

# STEP 1: Stop Supabase if running
echo "Step 1: Stop Supabase containers"
docker-compose -f supabase/docker-compose.yml down 2>/dev/null || true

# STEP 2: Reset database (WARNING: Data loss)
echo "Step 2: Reset database"
docker-compose -f supabase/docker-compose.yml up -d 2>&1 | grep -i "postgres\|started" || true
sleep 5

# STEP 3: Apply migrations via Supabase CLI
echo "Step 3: Apply all migrations"
supabase migration list 2>&1 || echo "CLI check: supabase CLI required"

# PREFERRED: Supabase CLI
if command -v supabase &> /dev/null; then
  supabase link --project-ref local
  supabase migration up
  echo "✓ Migrations applied via CLI"
else
  echo "⚠ Supabase CLI not found - use alternative:"
  echo "  Option A: npm install -g @supabase/cli"
  echo "  Option B: Direct psql + migration files (see migration_direct.sql)"
fi

# STEP 4: Validate schema
echo "Step 4: Validate schema"
psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c "\dt public.machines" 2>/dev/null && echo "✓ machines table exists" || echo "✗ machines table missing"
psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c "\dt public.parts" 2>/dev/null && echo "✓ parts table exists" || echo "✗ parts table missing"
psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c "\dt public.part_orders" 2>/dev/null && echo "✓ part_orders table exists" || echo "✗ part_orders table missing"

echo "[DONE] DB recovery runbook complete"
