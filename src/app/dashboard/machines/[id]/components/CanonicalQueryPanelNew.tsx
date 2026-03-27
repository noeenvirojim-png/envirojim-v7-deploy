'use client';

import { useState } from 'react';
import { Search, AlertCircle, Zap, Wrench, AlertTriangle, BookOpen, FileText, CheckCircle } from 'lucide-react';

function synthesizeDiagnosis(result: any) {
  if (!result || !result.top_cluster) return null;
  const top = result.top_cluster;
  const faults = result.linked_faults || [];
  const maint = result.linked_maintenance_tasks || [];
  let attention = '';
  if (faults.length > 0) {
    attention = top.canonical_name + ' has ' + faults.length + ' associated fault condition(s). Recommended actions required.';
  } else if (maint.length > 0) {
    attention = top.canonical_name + ' requires maintenance attention. ' + maint.length + ' recommended action(s) available.';
  } else {
    attention = top.canonical_name + ' found in knowledge base. No immediate faults detected.';
  }
  const checks = [];
  if (faults.length > 0) checks.push('Review ' + faults.length + ' fault condition(s)');
  if (maint.length > 0) checks.push('Perform: ' + (maint[0]?.name || 'maintenance'));
  return {
    top: top.canonical_name,
    attention,
    checks: checks.slice(0, 3),
    evidence: result.evidence_refs?.length || 0,
  };
}

export function CanonicalQueryPanel({ machineId }: { machineId: string }) {
  const [activeMode, setActiveMode] = useState<'diagnostic' | 'search'>('diagnostic');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      setError(activeMode === 'diagnostic' ? 'Please enter a symptom or component' : 'Please enter a search term');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setDiagnosis(null);
    try {
      const response = await fetch('/api/machines/' + machineId + '/canonical-query?q=' + encodeURIComponent(query));
      if (!response.ok) throw new Error('Query failed');
      const data = await response.json();
      setResult(data);
      if (activeMode === 'diagnostic') {
        const synth = synthesizeDiagnosis(data);
        if (synth) setDiagnosis(synth);
        else setError('No diagnostic information found');
      }
    } catch (err: any) {
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => { setActiveMode('diagnostic'); setResult(null); setDiagnosis(null); }}
          className={activeMode === 'diagnostic' ? 'px-4 py-3 font-medium text-sm border-b-2 border-emerald-600 text-emerald-600' : 'px-4 py-3 font-medium text-sm border-b-2 border-transparent text-slate-600'}
        >
          Diagnostic Mode
        </button>
        <button
          onClick={() => { setActiveMode('search'); setResult(null); setDiagnosis(null); }}
          className={activeMode === 'search' ? 'px-4 py-3 font-medium text-sm border-b-2 border-blue-600 text-blue-600' : 'px-4 py-3 font-medium text-sm border-b-2 border-transparent text-slate-600'}
        >
          Knowledge Search
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {activeMode === 'diagnostic' ? 'Describe a symptom or issue' : 'Search knowledge base'}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={activeMode === 'diagnostic' ? 'e.g., air in hydraulic system, oil filter issue...' : 'e.g., rotors, hydraulic system...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className={activeMode === 'diagnostic' ? 'px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium' : 'px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 font-medium'}
          >
            {loading ? 'Searching...' : <Search className="h-4 w-4" />}
          </button>
        </div>
        {error && (
          <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </div>
        )}
      </div>

      {activeMode === 'diagnostic' && diagnosis && (
        <div className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-emerald-700 uppercase mb-1">Identified</div>
                <h2 className="text-xl font-bold mb-2">{diagnosis.top}</h2>
                <p className="text-sm">{diagnosis.attention}</p>
              </div>
            </div>
          </div>
          {diagnosis.checks.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-sm font-semibold mb-3">Recommended Actions</h3>
              <ol className="space-y-2">
                {diagnosis.checks.map((check: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 h-5 w-5 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-medium text-emerald-600">{i + 1}</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {activeMode === 'search' && result && (
        <div className="space-y-6">
          {result.top_cluster && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-2">{result.top_cluster.canonical_name}</h2>
              <p className="text-sm text-slate-600">{result.top_cluster.cluster_type.replace(/_/g, ' ')} - {result.top_cluster.member_count} reference(s)</p>
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 p-12 text-center">
          <Search className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <div className="text-sm text-slate-600">{activeMode === 'diagnostic' ? 'Ready for diagnostic query' : 'Ready to search'}</div>
        </div>
      )}
    </div>
  );
}
