import { test, expect } from '@playwright/test';
import { dbMapper } from '../../src/lib/db-mapper';

/**
 * RUNTIME CHAOS CONTRACT
 * 
 * Verifies that the internal mappers correctly catch and block invalid data
 * using the Phase 3 runtime assertions.
 */

test.describe('Architecture Lockdown: Chaos Invariants', () => {

    test('DB Mapper should block non-super-admin missing organization_id', async () => {
        const invalidUser = {
            id: 'user-001',
            email: 'chaos@example.com',
            role: 'OPERATOR',
            organization_id: null // VIOLATION
        };

        // Expect the mapper to throw ARCH_INVARIANT_VIOLATION
        expect(() => dbMapper.mapUser(invalidUser)).toThrow(/ARCH_INVARIANT_VIOLATION/);
        expect(() => dbMapper.mapUser(invalidUser)).toThrow(/lacks organization_id/);
    });

    test('DB Mapper should allow SUPER_ADMIN missing organization_id', async () => {
        const superAdmin = {
            id: 'admin-001',
            email: 'boss@envirojim.com',
            role: 'SUPER_ADMIN',
            organization_id: null // ALLOWED
        };

        const mapped = dbMapper.mapUser(superAdmin);
        expect(mapped.role).toBe('SUPER_ADMIN');
        expect(mapped.organizationId).toBe('NO_ORG');
    });

});
