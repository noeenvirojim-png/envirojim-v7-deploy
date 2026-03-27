'use client';

import { useState } from 'react';
import { Search, AlertCircle, CheckCircle, Zap, Wrench, AlertTriangle, BookOpen } from 'lucide-react';

function synthesizeDiagnosis(result: any) {
  if (!result || !result.top_cluster) return null;

  const top = result.top_cluster;
  const faults = result.linked_faults || [];
  const maint = result.linked_maintenance_tasks || [];
  const parts = result.linked_parts || [];
  const systems = result.linked_systems || [];
  const evidence = result.evidence_refs || [];

  // Build "What needs attention"
  let attention = '';
  if (faults.length > 0) {
    attention = `${top.canonical_name} has ${faults.length} associated fault condition(s). Recommended actions required.`;
  } else if (maint.length > 0) {
    attention = `${top.canonical_name} requires maintenance attention. ${maint.length} recommended action(s) available.`;
  } else if (parts.length > 0 || systems.length > 0) {
    attention = `${top.canonical_name} related to maintenance and system checks. Review recommended actions.`;
  } else {
    attention = `${top.canonical_name} found in knowledge base. No immediate faults detected.`;
  }

  // Build "Recommended checks"
  const checks: string[] = [];

  if (faults.length > 0) {
    checks.push(`Review ${faults.length} fault condition(s) related to ${top.canonical_name.split(' ')[0]}`);
  }

  if (maint.length > 0) {
    const maintTitles = maint.slice(0, 2).map(m => m.name).join(', ');
    checks.push(`Perform: ${maintTitles}`);
  }

  if (parts.length > 0) {
    const partNames = parts.slice(0, 2).map(p => p.name).join(', ');
    checks.push(`Inspect components: ${partNames}`);
  }

  if (systems.length > 0 && systems.length <= 3) {
    const sysNames = systems.slice(0, 2).map(s => s.name).join(', ');
    checks.push(`Check system integration: ${sysNames}`);
  }

  return {
    top,
    attention,
    checks: checks.slice(0, 4),
    faults,
    maint,
    parts,
    systems,
    evidenceCount: evidence.length,
  };
}

export function DiagnosticPanel({ machineId }: { machineId: string }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a symptom, component, or maintenance task');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setDiagnosis(null);

    try {
      const response = await fetch(
        `/api/machines/${machineId}/canonical-query?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Diagnostic query failed');
      }

      const data = await response.json();
      setResult(data);

      const synth = synthesizeDiagnosis(data);
      if (synth) {
        setDiagnosis(synth);
      } else {
        setError('No diagnostic information found for this query');
      }
    } catch (err: any) {
      setError(err.message || 'Diagnostic failed');
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
      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Diagnostic Query
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Describe a symptom, component issue, or maintenance question
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. air in hydraulic system, oil filter, rotors, trémie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 font-medium"
              >
                {loading ? 'Analyzing...' : <Search className="h-4 w-4" />}
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

      {/* Diagnosis Result */}
      {diagnosis && (
        <div className="space-y-6">
          {/* Top Match - Identified Issue */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">
                  Identified Component
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {diagnosis.top.canonical_name}
                </h2>
                <div className="space-y-2">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 rounded font-medium">
                      {diagnosis.top.cluster_type.replace(/_/g, ' ')}
                    </span>
                    {diagnosis.top.member_count && (
                      <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                        {diagnosis.top.member_count} reference(s) in knowledge base
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What Needs Attention */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Attention Required
            </h3>
            <p className="text-base text-slate-700 dark:text-slate-300">
              {diagnosis.attention}
            </p>
          </div>

          {/* Recommended Checks */}
          {diagnosis.checks.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                Recommended Actions
              </h3>
              <ol className="space-y-3">
                {diagnosis.checks.map((check: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 h-6 w-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 pt-0.5">{check}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Related Issues */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Faults */}
            {diagnosis.faults.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Related Faults ({diagnosis.faults.length})
                </h3>
                <div className="space-y-2">
                  {diagnosis.faults.slice(0, 3).map((f: any, i: number) => (
                    <div key={i} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                      <div className="font-medium text-slate-900 dark:text-white">{f.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance */}
            {diagnosis.maint.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  Maintenance Tasks ({diagnosis.maint.length})
                </h3>
                <div className="space-y-2">
                  {diagnosis.maint.slice(0, 3).map((m: any, i: number) => (
                    <div key={i} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts */}
            {diagnosis.parts.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  Components ({diagnosis.parts.length})
                </h3>
                <div className="space-y-2">
                  {diagnosis.parts.slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="text-sm p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800">
                      <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Systems */}
            {diagnosis.systems.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  Related Systems ({diagnosis.systems.length})
                </h3>
                <div className="space-y-2">
                  {diagnosis.systems.slice(0, 3).map((s: any, i: number) => (
                    <div key={i} className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Evidence & Knowledge */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Knowledge Base Coverage
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>{diagnosis.evidenceCount}</strong> source reference(s) found in machine knowledge base
            </p>
            <div className="mt-3 text-xs text-slate-500">
              Diagnostic based on {diagnosis.faults.length + diagnosis.maint.length + diagnosis.parts.length + diagnosis.systems.length} related components
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!diagnosis && !loading && !error && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Zap className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Ready for Diagnostic Query
          </div>
          <p className="text-xs text-slate-500">
            Describe a symptom, component, or maintenance question to get actionable insights from the machine knowledge base
          </p>
        </div>
      )}
    </div>
  );
}
