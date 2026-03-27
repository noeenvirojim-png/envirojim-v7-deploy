'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface BuildResult {
  success: boolean;
  error?: string;
  counts?: {
    source_entities: number;
    evidence: number;
    documents: number;
    canonical_clusters: number;
    canonical_members: number;
    canonical_links: number;
    counts_by_type?: Record<string, number>;
  };
}

export function BuildMachineKnowledgeButton({ machineId }: { machineId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleBuild = async () => {
    setIsLoading(true);
    setShowResult(false);
    setResult(null);

    try {
      const response = await fetch(
        `/api/admin/machines/${machineId}/build-machine-knowledge`,
        { method: 'POST' }
      );

      const data = await response.json();
      setResult(data);
      setShowResult(true);

      // On success, refresh page data after 2 seconds to show new counts
      if (data.success) {
        setTimeout(() => {
          router.refresh();
          setShowResult(false);
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleBuild}
        disabled={isLoading}
        variant="default"
        size="sm"
        className="gap-2"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoading ? 'Building...' : 'Build Knowledge'}
      </Button>

      {showResult && result && (
        <div
          className={`p-3 rounded text-sm ${
            result.success
              ? 'bg-green-50 text-green-900 border border-green-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {result.success ? (
            <div className="space-y-1">
              <p className="font-medium">✓ Build Complete</p>
              {result.counts && (
                <div className="text-xs space-y-0.5">
                  <p>Clusters: {result.counts.canonical_clusters}</p>
                  <p>Entities: {result.counts.source_entities}</p>
                  {result.counts.counts_by_type && Object.keys(result.counts.counts_by_type).length > 0 && (
                    <p>
                      Types: {Object.entries(result.counts.counts_by_type)
                        .filter(([_, v]) => v > 0)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="font-medium">✗ Build Failed</p>
              <p className="text-xs mt-1">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
