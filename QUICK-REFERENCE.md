# ⚡ QUICK REFERENCE - BLOC M EXECUTION

## TL;DR

All Phase 3 code is ready. Local Supabase Docker is not accessible from Claude environment.

**You must execute from your local terminal where Docker runs.**

---

## The One Command

```bash
cd "C:\Users\Noé EVE\OneDrive - Envirojim\Bureau\Claude - Envirojim Repo\CURRENT_APP"
node scripts/bloc-m-supabase-closure.mjs
```

Takes ~30 seconds. Proves all Phase 3 functionality.

---

## Checklist Before Running

- [ ] Docker is running: `docker ps | findstr supabase`
- [ ] In project root directory
- [ ] .env.local exists with `SUPABASE_URL=http://127.0.0.1:54321`
- [ ] Node.js available: `node --version`

---

## What It Does (7 Steps)

1. Verify environment variables ✓
2. Connect to local Supabase ✓
3. Find NEEDS_REVIEW parts (~27 expected) ✓
4. Create review-decisions.csv ✓
5. Apply decisions to database ✓
6. Verify decisions persisted ✓
7. Calculate production readiness ✓

---

## Expected Result

```
✓ BLOC M COMPLETE - PHASE 3 REAL EXECUTION VERIFIED
Production ready: YES or NO
```

---

## Files It Creates

```
artifacts/bloc-j/review-decisions.csv
  → Decisions applied (with real part IDs)
```

---

## If It Fails

| Error | Cause | Fix |
|-------|-------|-----|
| fetch failed | Docker not running | Start Docker |
| Table not found | Migration not applied | Run `supabase migrations repair` |
| No NEEDS_REVIEW | Database empty | Check Phase 1 completed |

---

## After Success

Run remaining BLOCs:
```bash
node scripts/bloc-j-promote-reviewed-parts.mjs
node scripts/bloc-k-review-ui-smoke.mjs
node scripts/bloc-l-final-parts-readiness.mjs
```

---

## Documentation

- **Full Guide**: BLOC-M-EXECUTION-GUIDE.md
- **Status**: PHASE-3-EXECUTION-STATUS.md
- **Summary**: PHASE-3-COMPLETION-SUMMARY.md
- **This file**: QUICK-REFERENCE.md

---

## Questions?

1. Docker not running? → Start it
2. Error output? → Check BLOC-M-EXECUTION-GUIDE.md
3. Code issue? → Review PHASE-3-COMPLETION-SUMMARY.md

**Bottom line**: Execute the command above from your Docker terminal. That closes Phase 3.
