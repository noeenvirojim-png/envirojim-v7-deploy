# 🗝️ MISSION CONTINUITY: ENVIROJIM V6 SUPREME

> [!IMPORTANT]
> This document is designed for the successor AI agent. It contains the essential technical DNA of the project to ensure 100% continuity without context loss.

## 1. Project DNA & Vision
**EnviroJim V6** is an enterprise-grade platform for industrial asset management, maintenance, and procurement.
- **Target**: "Nuclear" Certification (Zero-Trust, Zero-Bugs, Production Ready).
- **Core Strategy**: Bounded Contexts + Clean Architecture + RLS-First Database.

## 2. Technical Stack (Canonical)
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres)
- **Security**: 
  - **RLS**: Row-Level Security on ALL tables.
  - **Zero-Trust**: Direct SQL queries banned in frontend; use `rpc()` and domain services.
  - **Auth**: `custom_access_token_hook` for claim injection (org_id, role).
- **Architecture**:
  - `src/domain/`: Bounded contexts (Assets, Support, Identity, Procurement).
  - `src/lib/db-mapper.ts`: The "Rosetta Stone" mapping SQL (snake_case) to TS (camelCase).
  - `src/lib/auth-bridge.ts`: Centralized identity provider for the app.

## 3. Version Evolution & Logic
- **V1-V3**: Core entity definitions and basic CRUD.
- **V4**: Security layer hardening (Audit triggers, RLS isolation).
- **V5**: Multi-tenancy refinement.
- **V6 (Current)**: Enterprise Supreme. Full schema normalization, granular permissions, and "Digital Twin" machine states.

## 4. Engineering Challenges & Known Issues (THE "REAL" STUFF)
1. **The Auth Hook Paradox**: The `custom_access_token_hook` requires specific permissions in the `auth` schema. If login fails on the new machine with `401` or `missing claims`, first check `db/CONFIGURE_AUTH_HOOK.sql`.
2. **Naming Drift**: Historically, some columns like `organization_id` vs `org_id` caused issues. ALWAYS refer to `lib/db-mapper.ts` for the truth.
3. **AI Integration**: The `gemini.ts` backend is ready, but the UI for "Voice Diagnostics" is only PARTIAL. High priority for next steps.
4. **RLS on Diagnostic Nodes**: Current tests suggest RLS might block reads for technicians. Needs forensic verification.

## 5. Critical Files to Study FIRST
1. [ARCHITECTURE_CANONICAL.md](file:///./ARCHITECTURE_CANONICAL.md): The law of the land.
2. [src/lib/auth-bridge.ts](file:///./src/lib/auth-bridge.ts): How we handle users.
3. [db/DEPLOY_V6_PRODUCTION_ULTIMATE.sql](file:///./db/DEPLOY_V6_PRODUCTION_ULTIMATE.sql): The most recent database blueprint.
4. [scripts/manual-schema-check.ts](file:///./scripts/manual-schema-check.ts): The "Truth Gate" script.

## 6. Immediate Roadmap for Successor
- [ ] **Verification**: Run `npm run validate:runtime` (Playwright) immediately after DB setup.
- [ ] **Procurement**: Finalize the `RFQ` (Request for Quote) module logic in `src/domain/procurement`.
- [ ] **UI Polish**: Complete the integration of the Digital Twin dashboard widgets.
- [ ] **Prod Cert**: Finalize `AUDIT_PROOF_FINAL.json` for the billionaire board review.

**GODSPEED, AGENT.**
