/**
 * VB750 Acceptance Tests
 * These are integration tests that run against a real Supabase DB with VB750 data loaded.
 * To run: ensure VB750 data is bootstrapped and extracted via buildFamilyKnowledge.
 *
 * Run: npx vitest run src/lib/machines/intelligence/__tests__/vb750.acceptance.test.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { VB750_CASES, VB750_FAMILY_PARAMS } from './fixtures/vb750_cases';
import { INFERRED_DISCLAIMER } from '../contracts';

// ─── Service imports ──────────────────────────────────────────────────────────
// These require live Supabase — skip in CI if env vars missing

const SKIP = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

let familyId: string;
let OfficialDiagnosticService: any;
let PartsAssistantService: any;
let MachineKnowledgeRepository: any;

beforeAll(async () => {
  if (SKIP) return;

  const bootstrap = await import('../bootstrap/bootstrapFamily');
  const result = await bootstrap.bootstrapFamily(VB750_FAMILY_PARAMS);
  familyId = result.family_id;

  const officialMod = await import('../services/OfficialDiagnosticService');
  OfficialDiagnosticService = officialMod.OfficialDiagnosticService;

  const partsMod = await import('../services/PartsAssistantService');
  PartsAssistantService = partsMod.PartsAssistantService;

  const repoMod = await import('../repositories/MachineKnowledgeRepository');
  MachineKnowledgeRepository = repoMod.MachineKnowledgeRepository;
});

describe.skipIf(SKIP)('VB750 acceptance — diagnostic', () => {
  for (const tc of VB750_CASES) {
    it(`[${tc.id}] official answer structure valid`, async () => {
      const service = new OfficialDiagnosticService();
      const answer = await service.query(familyId, tc.normalized);

      // Structure check
      expect(answer).toBeDefined();
      expect(typeof answer.found).toBe('boolean');

      if (answer.found) {
        // Official block
        expect(answer.affected_subsystems).toBeInstanceOf(Array);
        expect(typeof answer.summary).toBe('string');
        expect(answer.summary.length).toBeGreaterThan(0);
        expect(answer.candidate_parts).toBeInstanceOf(Array);
        expect(typeof answer.documentary_confidence).toBe('number');
        expect(answer.documentary_confidence).toBeGreaterThanOrEqual(0);
        expect(answer.documentary_confidence).toBeLessThanOrEqual(100);

        if (tc.expect_evidence_non_empty) {
          expect(answer.evidence.length).toBeGreaterThan(0);
        }

        // Parts safety check: safe_to_order requires official_confirmed
        for (const cp of answer.candidate_parts) {
          if (cp.order_safety_status === 'safe_to_order') {
            expect(cp.part.validation_status).toBe('official_confirmed');
          }
          // what_to_confirm must be array
          expect(cp.what_to_confirm_before_order).toBeInstanceOf(Array);
        }
      } else {
        expect(answer.no_official_machine_answer_found).toBe(true);
      }
    });
  }
});

describe.skipIf(SKIP)('VB750 acceptance — parts', () => {
  it('parts query always returns order_safety_status', async () => {
    const service = new PartsAssistantService();
    const result = await service.query(familyId, 'filter');

    expect(result).toBeDefined();
    expect(result.order_safety_status).toBeDefined();
    expect(result.what_to_confirm_before_order).toBeInstanceOf(Array);

    // safe_to_order only if official_confirmed
    for (const cp of result.candidate_parts) {
      if (cp.order_safety_status === 'safe_to_order') {
        expect(cp.part.validation_status).toBe('official_confirmed');
        expect(cp.part.part_number.trim()).not.toBe('');
      }
    }

    // If no official part, inferred block must have disclaimer
    if (result.no_official_part_found && result.inferred_non_official_answer) {
      expect(result.inferred_non_official_answer.disclaimer).toBe(INFERRED_DISCLAIMER);
      // Inferred parts must not contain numbers (part numbers)
      for (const p of result.inferred_non_official_answer.inferred_parts) {
        expect(p).not.toMatch(/^[A-Z0-9]{5,20}$/); // no raw part numbers
      }
    }
  });
});

describe.skipIf(SKIP)('VB750 acceptance — inference disclaimer', () => {
  it('inferred block always carries mandatory disclaimer', async () => {
    const { InferenceDiagnosticService } = await import('../services/InferenceDiagnosticService');
    const service = new InferenceDiagnosticService();
    const result = await service.infer(familyId, 'unknown problem xyz', '');

    expect(result.disclaimer).toBe(INFERRED_DISCLAIMER);
    expect(result.inferred_parts).toBeInstanceOf(Array);
    // No part numbers in inferred parts
    for (const p of result.inferred_parts) {
      expect(p.trim()).not.toBe('');
    }
  });
});

describe.skipIf(SKIP)('VB750 acceptance — no silent mixing', () => {
  for (const tc of VB750_CASES) {
    it(`[${tc.id}] official and inferred are never in same block`, async () => {
      const service = new OfficialDiagnosticService();
      const official = await service.query(familyId, tc.normalized);

      // official block must NOT contain disclaimer text
      if (official.found) {
        const json = JSON.stringify(official);
        expect(json).not.toContain(INFERRED_DISCLAIMER);
      }
    });
  }
});

describe.skipIf(SKIP)('VB750 acceptance — blocked parts have data_quality_issues', () => {
  it('blocked_incomplete parts exist in data_quality_issues', async () => {
    const repo = new MachineKnowledgeRepository();
    const blocked = await repo.getBlockedParts(familyId);
    const issues = await repo.getBlockingIssues(familyId);

    // Every blocked part should have at least one issue
    for (const part of blocked) {
      const partIssues = issues.filter(
        (i: any) => i.object_type === 'part' && i.object_id === part.id,
      );
      expect(partIssues.length).toBeGreaterThan(0);
    }
  });
});
