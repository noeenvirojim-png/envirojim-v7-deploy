/**
 * Extracts potential industrial error codes from a user query.
 * Matches common patterns like E342, F-901, ERR-12, A500.
 */
export async function extractErrorCodes(query: string): Promise<string[]> {
    const errorPattern = /\b([EFA]-?\d{2,4}|ERR(?:OR)?-?\d{1,4})\b/gi;
    const matches = query.match(errorPattern);

    if (!matches) return [];

    // Normalize to uppercase and remove hyphens for deterministic matching
    return matches.map(m => m.toUpperCase().replace('-', ''));
}
