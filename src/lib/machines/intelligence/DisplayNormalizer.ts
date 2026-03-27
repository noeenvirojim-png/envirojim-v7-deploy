/**
 * Display Normalizer
 * Lightweight presentation layer to clean up canonical cluster names for UI display
 * Does NOT modify database - only improves readability at display time
 */

export interface DisplayCluster {
  id: string;
  display_name: string;
  cluster_type: string;
  confidence: string;
  member_count: number;
  original_canonical_name: string;
}

/**
 * Parasitic name patterns to filter out
 */
const PARASITIC_PATTERNS = [
  /^\d+\s+[Oo]f\s+\d+$/,  // "2 Of 3", "1 of 4"
  /^[\d\s\-\._,]+$/,       // Only numbers/punctuation
  /^\s*-+\s*$/,            // Just dashes/spaces
  /^n\/a$/i,               // Not applicable
  /^unknown$/i,            // Unknown
  /^component$/i,          // Generic
  /^part$/i,               // Generic
  /^assembly$/i,           // Generic
  /^element$/i,            // Too generic
  /^\-\s+/,                // Starts with dash
];

/**
 * Check if a name is parasitic (should be hidden)
 */
function isParasiticName(name: string): boolean {
  const trimmed = (name || '').trim();

  // First check: standard patterns
  if (PARASITIC_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return true;
  }

  // Second check: after removing leading/trailing dashes and spaces
  const cleaned = trimmed.replace(/^[\s\-]+|[\s\-]+$/g, '').trim();
  if (cleaned && PARASITIC_PATTERNS.some(pattern => pattern.test(cleaned))) {
    return true;
  }

  return false;
}

/**
 * Score a name for display quality
 * Higher score = better for display
 */
function scoreNameQuality(name: string): number {
  const trimmed = (name || '').trim();

  // Parasitic = lowest score
  if (isParasiticName(trimmed)) return 0;

  // Length: prefer mid-range (8-30 chars)
  const len = trimmed.length;
  const lengthScore = len >= 8 && len <= 30 ? 3 : (len > 30 ? 1 : 2);

  // Capitalization: prefer CamelCase or Title Case (marks human-curated)
  const hasCapital = /[A-Z]/.test(trimmed);
  const capitalScore = hasCapital ? 2 : 1;

  // Words: prefer 2-3 words (more specific)
  const wordCount = trimmed.split(/\s+/).length;
  const wordScore = wordCount >= 2 && wordCount <= 3 ? 3 : (wordCount <= 1 ? 1 : 2);

  // Special: penalize generic words
  const generic = /^(filter|element|part|component|assembly)$/i.test(trimmed);
  const genericScore = generic ? 1 : 3;

  return lengthScore + capitalScore + wordScore + genericScore;
}

/**
 * Choose best display name from canonical name and aliases
 */
function chooseBestDisplayName(
  canonicalName: string,
  aliases: string[] = []
): string {
  const candidates = [canonicalName, ...aliases].filter(
    name => name && name.trim()
  );

  // Score each candidate
  const scored = candidates.map(name => ({
    name,
    score: scoreNameQuality(name),
  }));

  // Sort by score (descending), then by length (prefer shorter if tied)
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.name.length - b.name.length;
  });

  // Return best, or original if all are parasitic
  return scored[0]?.score > 0 ? scored[0].name : canonicalName;
}

/**
 * Normalize a cluster for display
 */
export function normalizeClusterForDisplay(
  cluster: {
    id: string;
    canonical_name: string;
    cluster_type: string;
    confidence: string;
    member_count: number;
  },
  aliases: string[] = []
): DisplayCluster {
  const displayName = chooseBestDisplayName(cluster.canonical_name, aliases);

  return {
    id: cluster.id,
    display_name: displayName,
    cluster_type: cluster.cluster_type,
    confidence: cluster.confidence,
    member_count: cluster.member_count,
    original_canonical_name: cluster.canonical_name,
  };
}

/**
 * Filter out parasitic clusters from a list
 */
export function filterParasiticClusters<T extends { display_name: string }>(
  clusters: T[]
): T[] {
  return clusters.filter(c => !isParasiticName(c.display_name));
}

/**
 * Deduplicate clusters by display name (display-level dedup only)
 * Keeps first occurrence, filters near-duplicates
 */
export function deduplicateByDisplayName<T extends { display_name: string }>(
  clusters: T[]
): T[] {
  const seen = new Map<string, T>();

  for (const cluster of clusters) {
    const normalized = cluster.display_name.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.set(normalized, cluster);
    }
  }

  return Array.from(seen.values());
}
