/**
 * Normalization Utility
 * Ensures consistent data formats across Assets, Diagnostics, and Maintenance.
 */

/**
 * Standardizes Serial Numbers:
 * - Trims whitespace
 * - Converts to Uppercase
 * - Removes common prefix if present (optional but recommended for fuzzy match)
 */
export function normalizeSerialNumber(sn: string): string {
    if (!sn) return '';
    return sn.trim().toUpperCase();
}
