'use client';

import { useState } from 'react';
import { Search, AlertCircle, Zap, Wrench, AlertTriangle, BookOpen, Database } from 'lucide-react';

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    system: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    part: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    maintenance_target: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    fault_target: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };
  return colors[type] || 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
}

function getTypeIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    system: <Zap className="h-4 w-4 text-blue-600" />,
    part: <Wrench className="h-4 w-4 text-emerald-600" />,
    maintenance_target: <BookOpen className="h-4 w-4 text-amber-600" />,
    fault_target: <AlertTriangle className="h-4 w-4 text-red-600" />,
  };
  return icons[type];
}

export function CanonicalQueryPanel({ machineId }: { machineId: string }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        `/api/machines/${machineId}/canonical-query?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Query failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search Machine Knowledge Base
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. hydraulic system, oil filter, rotors, maintenance procedures..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {loading ? 'Searching...' : <Search className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Top Match - Main Answer */}
          {result.top_cluster && (
            <div className={`rounded-lg border p-6 ${getTypeColor(result.top_cluster.cluster_type)}`}>
              <div className="flex items-start gap-3">
                {getTypeIcon(result.top_cluster.cluster_type)}
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                    Top Match
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {result.top_cluster.canonical_name}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
                      {result.top_cluster.cluster_type.replace(/_/g, ' ')}
                    </span>
                    <span>{result.top_cluster.member_count} source reference(s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Related Systems */}
          {result.linked_systems && result.linked_systems.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Related Systems ({result.linked_systems.length})
              </h3>
              <div className="space-y-2">
                {result.linked_systems.slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                    <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-xs text-slate-500">Relationship: {s.link_type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Parts */}
          {result.linked_parts && result.linked_parts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Related Components ({result.linked_parts.length})
              </h3>
              <div className="space-y-2">
                {result.linked_parts.slice(0, 5).map((p: any, i: number) => (
                  <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                    <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500">Relationship: {p.link_type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Actions */}
          {result.linked_maintenance_tasks && result.linked_maintenance_tasks.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Maintenance Actions ({result.linked_maintenance_tasks.length})
              </h3>
              <div className="space-y-2">
                {result.linked_maintenance_tasks.slice(0, 5).map((m: any, i: number) => (
                  <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-sm">
                    <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                    <div className="text-xs text-slate-500">Type: {m.link_type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fault Context */}
          {result.linked_faults && result.linked_faults.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Associated Faults ({result.linked_faults.length})
              </h3>
              <div className="space-y-2">
                {result.linked_faults.slice(0, 5).map((f: any, i: number) => (
                  <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm border border-red-200 dark:border-red-800">
                    <div className="font-medium text-slate-900 dark:text-white">{f.name}</div>
                    <div className="text-xs text-slate-500">Relationship: {f.link_type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence & Knowledge Graph */}
          {(result.evidence_refs?.length > 0 || result.related_paths?.length > 0) && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Knowledge Graph Context
              </h3>
              <div className="space-y-3 text-sm">
                {result.evidence_refs?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Evidence: {result.evidence_refs.length} source references
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Found across {result.confidence_summary?.total_matches || 0} cluster(s) with{' '}
                      {result.confidence_summary?.link_count || 0} relationship links
                    </div>
                  </div>
                )}

                {result.related_paths?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Related Topics: {result.related_paths.length}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.related_paths.map((p: any, i: number) => (
                        <span key={i} className="inline-block px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {p.name?.substring(0, 30)}...
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Confidence: <strong>{result.confidence_summary?.avg_confidence || 'MEDIUM'}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {result && result.matched_clusters.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            No matches found for "<strong>{query}</strong>"
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Try searching for system names, part numbers, maintenance tasks, or fault descriptions.
          </div>
        </div>
      )}
    </div>
  );
}
