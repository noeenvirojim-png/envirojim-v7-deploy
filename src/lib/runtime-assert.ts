/**
 * Runtime Invariant Assertions
 */

export function assert(condition: any, msg: string) {
    if (!condition) {
        console.error("CRITICAL: RUNTIME INVARIANT FAILED:", msg);
        // In production, we might log to a service. 
        // In dev/test, we crash to prevent silent corruption.
        throw new Error(`ARCH_INVARIANT_VIOLATION: ${msg}`);
    }
}

/**
 * Domain-specific assertions
 */
export function assertUser(user: any) {
    assert(user, "User context is missing");
    assert(user.id, "Missing user ID");
    assert(user.role, "Missing role claim");
    assert(user.organization_id || user.role === 'SUPER_ADMIN', "Missing organization_id for non-super user");
}
