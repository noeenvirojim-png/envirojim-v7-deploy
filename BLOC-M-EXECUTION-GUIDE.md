# BLOC M EXECUTION GUIDE

## Current Blocker
**Status**: Supabase connectivity failure
**Root Cause**: `http://127.0.0.1:54321` (local Supabase) not accessible from execution context
**Error**: `TypeError: fetch failed`
**Action Required**: Execute from environment where Supabase IS accessible

---

## OPTION 1: Execute from Docker/Local Environment (WHERE SUPABASE RUNS)

### Prerequisites
- Supabase local instance running via Docker
- Verify: `docker ps | grep supabase`
- Verify connectivity: `curl http://127.0.0.1:54321/rest/v1/`

### Steps
1. Open terminal in project root: `/c/Users/Noé\ EVE/OneDrive\ -\ Envirojim/Bureau/Claude\ -\ Envirojim\ Repo/CURRENT_APP`
2. Verify environment loaded:
   ```bash
   cat .env.local | grep SUPABASE
   ```
3. Execute BLOC M:
   ```bash
   node scripts/bloc-m-supabase-closure.mjs
   ```

### Expected Output
```
[BLOC M] SUPABASE REAL EXECUTION CLOSURE
[ÉTAPE 1] ENVIRONMENT VERIFICATION
✓ SUPABASE_URL present
✓ SERVICE_ROLE_KEY present
[ÉTAPE 2] DATABASE CONNECTIVITY & SAMPLE ROWS
✓ Found N real NEEDS_REVIEW rows
[ÉTAPE 3] CREATE MINIMAL REAL CSV
✓ Created review-decisions.csv with N real decisions
[ÉTAPE 4] APPLY REVIEW DECISIONS
✓ Applied N/N decisions
[ÉTAPE 5] VERIFY REVIEW DECISIONS
...
✓ BLOC M COMPLETE - PHASE 3 REAL EXECUTION VERIFIED
```

---

## OPTION 2: Replace with Cloud Supabase URL

### Prerequisites
- Cloud Supabase project created
- Service role key obtained
- Project URL accessible from internet

### Steps
1. Modify `.env.local` (or create `.env.production`):
   ```bash
   # Replace localhost with cloud URL
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Verify cloud database has parts data:
   ```bash
   node scripts/bloc-diagnostic-db-state.mjs
   ```

3. Execute BLOC M:
   ```bash
   node scripts/bloc-m-supabase-closure.mjs
   ```

---

## OPTION 3: Verify Database State First (Recommended)

Before executing BLOC M, verify database contains NEEDS_REVIEW rows:

```bash
node scripts/bloc-diagnostic-db-state.mjs
```

### Expected Output
```
[DIAGNOSTIC] DATABASE STATE INVESTIGATION
✓ parts_extraction_rows exists
✓ Total rows: N

[ÉTAPE 2] BREAKDOWN BY VALIDATION_STATUS
  - VALIDATED: N
  - NEEDS_REVIEW: N

[ÉTAPE 4] NEEDS_REVIEW ROWS DETAILED
- Total NEEDS_REVIEW rows: N
- Sample NEEDS_REVIEW rows:
  ...

[ÉTAPE 5] BLOC M READINESS ASSESSMENT
✓ BLOC M CAN EXECUTE
  Available NEEDS_REVIEW rows: N
```

---

## BLOC M Execution Sequence

When executed from accessible Supabase environment, BLOC M will:

1. **ÉTAPE 1**: Verify env vars (SUPABASE_URL + SERVICE_ROLE_KEY)
2. **ÉTAPE 2**: Query database for NEEDS_REVIEW rows (need ≥1 row)
3. **ÉTAPE 3**: Create CSV with decisions:
   - Row 1: APPROVED decision
   - Row 2: REJECTED decision (if exists)
   - Row 3: CORRECTED decision (if exists)
4. **ÉTAPE 4**: Apply decisions to `parts_review_decisions` table
5. **ÉTAPE 5**: Verify decisions persisted
6. **ÉTAPE 6**: UI smoke test on relationships
7. **ÉTAPE 7**: Calculate final readiness verdict

### Output Files Created
- `artifacts/bloc-j/review-decisions.csv` - decisions applied
- Console output with metrics

### Final Verdict Logic
```
Production Ready =
  (remaining_needs_review ≤ 5) AND (safe_truth_coverage ≥ 90%)
```

---

## Troubleshooting

### Error: "No NEEDS_REVIEW rows found"
**Cause**: Database may be empty or all parts already VALIDATED
**Solution**:
- Run `bloc-diagnostic-db-state.mjs` to check
- Re-run Phase 1 (BLOC A-D) to extract parts
- OR verify correct organization/machine scope

### Error: "fetch failed"
**Cause**: Supabase URL not accessible
**Solution**:
- Verify Supabase instance running: `docker ps | grep supabase`
- Verify network connectivity: `curl $SUPABASE_URL/rest/v1/`
- Use cloud Supabase (Option 2) instead

### Error: "migration not applied"
**Cause**: `parts_review_decisions` table doesn't exist
**Solution**:
- Apply migration: `supabase migrations repair`
- OR manually create table (see schema below)

---

## Database Schema Required

```sql
CREATE TABLE public.parts_review_decisions (
  id uuid primary key default gen_random_uuid(),
  extraction_row_id uuid references parts_extraction_rows(id) on delete cascade,
  machine_id uuid references machines(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  decision_status text check (decision_status in ('APPROVED','CORRECTED','REJECTED','ESCALATED')),
  corrected_part_number text,
  corrected_designation text,
  corrected_qty numeric,
  corrected_notes text,
  rationale text,
  is_active boolean default true,
  created_at timestamptz default now()
);

CREATE UNIQUE INDEX uq_parts_review_decisions_active_row
  ON parts_review_decisions(extraction_row_id)
  WHERE is_active=true;

ALTER TABLE parts_review_decisions ENABLE ROW LEVEL SECURITY;
```

---

## Next Steps After BLOC M

Once BLOC M executes successfully:

1. **BLOC J**: Promote reviewed parts to truth layer
   ```bash
   node scripts/bloc-j-promote-reviewed-parts.mjs
   ```

2. **BLOC K**: Run UI smoke test
   ```bash
   node scripts/bloc-k-review-ui-smoke.mjs
   ```

3. **BLOC L**: Get final readiness verdict
   ```bash
   node scripts/bloc-l-final-parts-readiness.mjs
   ```

---

## Summary

**Current State**: All Phase 3 scripts created and ready, awaiting execution from accessible Supabase environment

**Blocker**: Network connectivity to localhost Supabase

**Resolution**: Execute from Docker/local environment OR use cloud Supabase URL

**Timeline**: Will complete Phase 3 closure upon execution
