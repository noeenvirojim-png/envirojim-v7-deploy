/**
 * bootstrapFamily — unit tests
 * Tests idempotency and structure. Uses a mock Supabase client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const insertedRows: Record<string, any[]> = {};
const existingRows: Record<string, any[]> = {
  machine_families: [],
  source_documents: [],
  subsystems: [],
  assemblies: [],
  components: [],
};

function makeChain(table: string, returnRow?: any) {
  const row = returnRow ?? { id: `mock-${table}-${Date.now()}-${Math.random()}` };
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: existingRows[table]?.length ? existingRows[table][0] : null,
      error: null,
    }),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
}

const mockSupabase = {
  from: vi.fn((table: string) => makeChain(table)),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

import { bootstrapFamily } from './bootstrapFamily';
import { BOOTSTRAP_SUBSYSTEMS } from '../contracts';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('bootstrapFamily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all tables to empty so idempotency insert paths run
    Object.keys(existingRows).forEach(k => { existingRows[k] = []; });
  });

  it('returns family_id and all 10 subsystem/assembly/component ids', async () => {
    const result = await bootstrapFamily({
      family_code: 'vb750',
      manufacturer: 'Doppstadt',
      brand: 'Doppstadt',
      model: 'VB750',
    });

    expect(result.family_id).toBeTruthy();
    for (const code of BOOTSTRAP_SUBSYSTEMS) {
      expect(result.subsystem_ids[code]).toBeTruthy();
      expect(result.assembly_ids[code]).toBeTruthy();
      expect(result.component_ids[code]).toBeTruthy();
    }
  });

  it('sets created=true when family is new', async () => {
    const result = await bootstrapFamily({
      family_code: 'vb750',
      manufacturer: 'Doppstadt',
      brand: 'Doppstadt',
      model: 'VB750',
    });
    expect(result.created).toBe(true);
  });

  it('sets created=false when family already exists', async () => {
    existingRows.machine_families = [{ id: 'existing-family-id' }];

    const result = await bootstrapFamily({
      family_code: 'vb750',
      manufacturer: 'Doppstadt',
      brand: 'Doppstadt',
      model: 'VB750',
    });
    expect(result.created).toBe(false);
    expect(result.family_id).toBe('existing-family-id');
  });

  it('creates exactly 10 subsystems', async () => {
    const result = await bootstrapFamily({
      family_code: 'vb750',
      manufacturer: 'Doppstadt',
      brand: 'Doppstadt',
      model: 'VB750',
    });
    expect(Object.keys(result.subsystem_ids)).toHaveLength(10);
    expect(BOOTSTRAP_SUBSYSTEMS).toHaveLength(10);
  });

  it('all subsystem codes match BOOTSTRAP_SUBSYSTEMS', async () => {
    const result = await bootstrapFamily({
      family_code: 'vb750',
      manufacturer: 'Doppstadt',
      brand: 'Doppstadt',
      model: 'VB750',
    });
    for (const code of BOOTSTRAP_SUBSYSTEMS) {
      expect(Object.keys(result.subsystem_ids)).toContain(code);
    }
  });
});
