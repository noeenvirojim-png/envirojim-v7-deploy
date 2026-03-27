'use client';
import { useState } from 'react';
import { Search, AlertCircle, CheckCircle, AlertTriangle, BookOpen, Wrench, Zap, Download, ShoppingCart, Loader2, RotateCcw, Save, FileText } from 'lucide-react';
import { requestPartFromKB } from '@/domain/procurement/actions/requestFromKB';
import { normalizeClusterForDisplay, filterParasiticClusters } from '@/lib/machines/intelligence/DisplayNormalizer';
import { saveDiagnosticSession } from '@/domain/diagnostics/actions/save-diagnostic';
import { saveDiagnosticFromEnriched } from '@/domain/diagnostics/actions/save-enriched-diagnostic';
import { enrichDiagnostic } from '@/domain/diagnostics/transformers';

interface PlaybookStep {
  id: string;
  step: number;
  title: string;
  description: string;
  type: 'check' | 'inspect' | 'verify' | 'replace' | 'maintain';
  completed: boolean;
}

export function CanonicalDiagnosticWrapper({ machineId }: { machineId: string }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [requestingPart, setRequestingPart] = useState<string | null>(null);
  const [playbookSteps, setPlaybookSteps] = useState<PlaybookStep[]>([]);
  const [savingDiagnostic, setSavingDiagnostic] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; id?: string; error?: string } | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please describe a symptom or component');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/machines/' + machineId + '/canonical-query?q=' + encodeURIComponent(query));
      if (!response.ok) throw new Error('Query failed');
      const data = await response.json();
      if (!data.top_cluster) {
        setError('No matching information found');
        return;
      }

      // Normalize top cluster for cleaner display
      try {
        if (data.top_cluster) {
          const normalized = normalizeClusterForDisplay(data.top_cluster, data.aliases || []);
          data.top_cluster_display = normalized.display_name;
        }

        // Clean up linked items (filter parasitic parts)
        if (data.linked_parts) {
          data.linked_parts = filterParasiticClusters(
            data.linked_parts.map((p: any) => ({ ...p, display_name: p.name }))
          ).map(p => ({ ...p, name: p.display_name }));
        }
      } catch (normError) {
        // Normalization failed, set result without normalized display
      }

      // Enrich diagnostic with structured metadata
      const enrichedData = enrichDiagnostic({
        machine_id: machineId,
        query,
        top_cluster_name: data.top_cluster_display || data.top_cluster?.canonical_name || 'Unknown',
        playbook_steps: [],
        related_faults: (data.linked_faults || []).map((f: any) => f.canonical_name || f.name),
        related_maintenance: (data.linked_maintenance_tasks || []).map((m: any) => m.canonical_name || m.name),
        related_parts: (data.linked_parts || []).map((p: any) => p.name || p.canonical_name),
        evidence_refs: data.evidence_refs || [],
      });
      data._enriched = enrichedData;

      setResult(data);

      // Generate diagnostic playbook from results
      const steps = generatePlaybookSteps(data);
      setPlaybookSteps(steps);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const generatePlaybookSteps = (data: any): PlaybookStep[] => {
    const steps: PlaybookStep[] = [];
    let stepNum = 1;

    // Step 1: Verify the main issue
    if (data.top_cluster) {
      steps.push({
        id: `step-${stepNum}`,
        step: stepNum++,
        title: `Verify ${data.top_cluster_display || data.top_cluster.canonical_name}`,
        description: 'Confirm the issue matches the query',
        type: 'verify',
        completed: false,
      });
    }

    // Steps from maintenance tasks
    const maint = data.linked_maintenance_tasks || [];
    maint.slice(0, 3).forEach((task: any) => {
      steps.push({
        id: `step-${stepNum}`,
        step: stepNum++,
        title: `Perform: ${task.canonical_name || task.name}`,
        description: 'Follow standard procedure',
        type: 'maintain',
        completed: false,
      });
    });

    // Steps from faults
    const faults = data.linked_faults || [];
    faults.slice(0, 2).forEach((fault: any) => {
      steps.push({
        id: `step-${stepNum}`,
        step: stepNum++,
        title: `Check for: ${fault.canonical_name || fault.name}`,
        description: 'Inspect for signs of this fault',
        type: 'check',
        completed: false,
      });
    });

    // Steps from parts
    const parts = data.linked_parts || [];
    parts.slice(0, 2).forEach((part: any) => {
      steps.push({
        id: `step-${stepNum}`,
        step: stepNum++,
        title: `Inspect: ${part.name || part.canonical_name}`,
        description: 'Check condition and fit',
        type: 'inspect',
        completed: false,
      });
    });

    return steps.length > 0 ? steps : [];
  };

  const toggleStep = (stepId: string) => {
    setPlaybookSteps(steps =>
      steps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s)
    );
  };

  const resetPlaybook = () => {
    setPlaybookSteps(steps => steps.map(s => ({ ...s, completed: false })));
  };

  const handleSaveDiagnostic = async () => {
    if (!result) return;
    setSavingDiagnostic(true);
    try {
      // Use enriched diagnostic if available
      const res = result._enriched
        ? await saveDiagnosticFromEnriched(result._enriched)
        : await saveDiagnosticSession({
            machine_id: machineId,
            query,
            top_cluster_name: result.top_cluster_display || result.top_cluster.canonical_name,
            playbook_steps: playbookSteps,
            related_faults: (result.linked_faults || []).map((f: any) => f.canonical_name || f.name),
            related_maintenance: (result.linked_maintenance_tasks || []).map((t: any) => t.canonical_name || t.name),
            related_parts: (result.linked_parts || []).map((p: any) => p.name || p.canonical_name),
            evidence_refs: result.evidence_refs || [],
          });
      setSaveResult(res);
      if (res.success) {
        setTimeout(() => setSaveResult(null), 3000);
      }
    } catch (err) {
      setSaveResult({ success: false, error: 'Erreur lors de la sauvegarde' });
    } finally {
      setSavingDiagnostic(false);
    }
  };

  const handleRequestPart = async (partName: string) => {
    setRequestingPart(partName);
    try {
      const res = await requestPartFromKB({
        machineId,
        partNumber: partName.substring(0, 20),
        partName: partName,
        quantity: 1,
        urgency: 'normal',
      });
      if (res.success) {
        alert('Part request submitted');
      } else {
        alert('Failed to request part');
      }
    } catch (err) {
      alert('Error requesting part');
    } finally {
      setRequestingPart(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const faults = result?.linked_faults || [];
  const maint = result?.linked_maintenance_tasks || [];
  const parts = result?.linked_parts || [];
  const systems = result?.linked_systems || [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Canonical Diagnostic</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Query the machine knowledge base</p>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., air in hydraulic system, oil filter, rotors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Analyzing...' : <Search className="h-4 w-4" />}
          </button>
        </div>
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-sm text-red-800 rounded-lg flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>
      {!result && !loading && !error && (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg">
          Enter a symptom or component name to begin
        </div>
      )}
      {result && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-l-4 border-emerald-600">
            <CheckCircle className="h-5 w-5 text-emerald-600 inline mr-2" />
            <div className="text-xs font-semibold text-emerald-700 uppercase">What Needs Attention</div>
            <p className="text-sm font-bold mt-1">{result.top_cluster_display || result.top_cluster.canonical_name}</p>
          </div>
          {playbookSteps.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-l-4 border-blue-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Diagnostic Playbook</span>
                </div>
                <button
                  onClick={resetPlaybook}
                  className="text-xs px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
              <ol className="mt-3 space-y-2">
                {playbookSteps.map((step) => (
                  <li key={step.id} className="flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-700 rounded">
                    <input
                      type="checkbox"
                      checked={step.completed}
                      onChange={() => toggleStep(step.id)}
                      className="mt-1 w-4 h-4 text-emerald-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 dark:text-white">
                        Step {step.step}: {step.title}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{step.description}</div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4">
                <button
                  onClick={handleSaveDiagnostic}
                  disabled={savingDiagnostic}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                >
                  {savingDiagnostic ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingDiagnostic ? 'Sauvegarde...' : 'Sauvegarder le diagnostic'}
                </button>
                {saveResult && (
                  <div className={`mt-3 p-3 rounded text-sm ${
                    saveResult.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {saveResult.success ? '✓ Diagnostic sauvegardé et action créée' : `✗ ${saveResult.error}`}
                  </div>
                )}
              </div>
            </div>
          )}
          {parts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-slate-900 dark:text-white">Related Parts ({parts.length})</span>
              </div>
              <div className="space-y-2">
                {parts.slice(0, 5).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                    <button
                      onClick={() => handleRequestPart(p.name)}
                      disabled={requestingPart === p.name}
                      className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {requestingPart === p.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <><ShoppingCart className="h-3 w-3" /> Request</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.evidence_refs?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-900 dark:text-white">Evidence ({result.evidence_refs.length})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{result.evidence_refs.length} source reference(s) available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
