# Machine Onboarding Kit

## Overview
Add a new machine to the production-ready generic platform with **config + data only, zero code changes**.

## Step 1: Add Machine Configuration

Edit `src/domain/machines/config.ts`:

```typescript
export const MACHINE_CONFIGS: Record<string, MachineConfig> = {
  // ... existing machines ...

  YOUR_MACHINE: {
    slug: 'YOUR_MACHINE',
    name: 'Your Machine Name',
    subsystemMap: {
      'Problem description 1': ['Subsystem1', 'Subsystem2'],
      'Problem description 2': ['Subsystem3'],
    },
    defaultProblemSubsystems: ['Subsystem1'],
  },
}
```

**Template variables:**
- `YOUR_MACHINE`: Machine slug (e.g., PT100, VC500)
- `Your Machine Name`: Human-readable name (e.g., "PT100 Compressor")
- `subsystemMap`: Map of problems to subsystems; subsystems matched against part designations
- `defaultProblemSubsystems`: Fallback subsystems if problem not in subsystemMap

**Common subsystems:**
- `Drivetrain` (motor, pump, rolle, antrieb)
- `Hydraulics` (pump, hydraul, cylinder, ventil)
- `Cooling` (cooler, kühl, fan, lüfter)
- `Electrical` (controller, display, modem, steuer)
- `Chassis` (ball, gehäuse, filter, block)

## Step 2: Seed Machine & Parts

Run this script (or execute SQL directly):

```sql
-- Create machine
INSERT INTO public.machines (name, owner_org_id)
VALUES ('YOUR_MACHINE-Machine', <org_id>)
RETURNING id;

-- Create parts (3-5 minimum)
INSERT INTO public.parts
  (machine_id, canonical_part_number, name, source_confidence, source_refs)
VALUES
  (<machine_id>, 'PART_NUMBER_1', 'Part Name 1', 0.93, '{"page": 0, "extraction_status": "VALIDATED"}'),
  (<machine_id>, 'PART_NUMBER_2', 'Part Name 2', 0.93, '{"page": 0, "extraction_status": "VALIDATED"}'),
  (<machine_id>, 'PART_NUMBER_3', 'Part Name 3', 0.93, '{"page": 0, "extraction_status": "VALIDATED"}');
```

## Step 3: Validate Setup

```bash
# Check machine was created
psql -h localhost -p 55322 -U postgres -d postgres \
  -c "SELECT id, name FROM public.machines WHERE name ILIKE '%YOUR_MACHINE%';"

# Check parts were loaded
psql -h localhost -p 55322 -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM public.parts WHERE machine_id = '<machine_id>';"
```

## Step 4: Test Flows

The generic flows automatically work on the new machine:

```typescript
// Diagnostic (reads parts, matches subsystems)
import { diagnosMachine } from '@/domain/machines/actions/diagnostic'
const diag = await diagnosMachine('YOUR_MACHINE', 'Problem description 1')

// Maintenance (reads parts, maps to tasks)
import { getMaintenanceTasks } from '@/domain/machines/actions/maintenance'
const tasks = await getMaintenanceTasks('YOUR_MACHINE')

// Procurement (reads parts, creates orders)
import { getAvailableParts, createProcurementOrder } from '@/domain/machines/actions/procurement'
const parts = await getAvailableParts('YOUR_MACHINE')
const order = await createProcurementOrder('YOUR_MACHINE', { selected_part_ids: [...] })
```

## Validation Checklist

- [ ] Config entry added to `src/domain/machines/config.ts`
- [ ] Machine row created in `public.machines`
- [ ] 3-5 parts created in `public.parts` with correct `machine_id` FK
- [ ] Subsystem keywords in config match actual part designations
- [ ] No code changes made to `src/domain/machines/actions/*`
- [ ] No new vertical folder created
- [ ] Flows execute successfully on new machine

## Files Changed
- `src/domain/machines/config.ts` (config only, no logic changes)
- `public.machines` table (insert only)
- `public.parts` table (insert only)

## Files NOT Changed
- `src/domain/machines/actions/diagnostic.ts`
- `src/domain/machines/actions/maintenance.ts`
- `src/domain/machines/actions/procurement.ts`
- Any UI or business logic files

## Verified Machines (Proof of Concept)
- VB750 (46 parts, diagnostic/maintenance/procurement proven)
- VC500 (4 parts, diagnostic/maintenance/procurement proven)
- HA250 (4 parts, diagnostic/maintenance/procurement proven)
- PT100 (4 parts, diagnostic/maintenance/procurement proven - config-only onboarding)
