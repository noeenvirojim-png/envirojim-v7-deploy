import { createHash } from 'crypto';

/**
 * Generates a unique evidence hash to prevent duplicate evidence processing
 */
export function generateEvidenceHash(fileName: string, pageNum: string | number, snippet: string): string {
  const content = `${fileName}|${pageNum}|${snippet.trim()}`;
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Calculates a readiness score based on KB quality metrics
 */
export function calculateReadiness(metrics: {
  confidence_avg: number;
  coverage_ratio: number;
  safety_risks_count: number;
  contradictions_count: number;
}): number {
  let score = (metrics.confidence_avg * 0.4) + (metrics.coverage_ratio * 0.6) * 100;
  
  // Penalize for risks and contradictions
  score -= metrics.safety_risks_count * 10;
  score -= metrics.contradictions_count * 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Formats duration strings or objects into a standardized format
 */
export function formatDuration(input: any): string {
  if (typeof input === 'string') return input;
  if (typeof input === 'number') return `${input} min`;
  return 'unknown';
}

/**
 * Chunking logic for large document sets
 */
export function chunkDocuments<T>(docs: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < docs.length; i += size) {
    chunks.push(docs.slice(i, i + size));
  }
  return chunks;
}
