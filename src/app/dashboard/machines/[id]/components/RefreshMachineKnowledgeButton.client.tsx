'use client';

import { useState } from 'react';
import { RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

export function RefreshMachineKnowledgeButton({ machineId }: { machineId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/machines/${machineId}/refresh-machine-knowledge`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        const counts = data.counts;
        setMessage(
          `Knowledge refreshed: ${counts.canonical_clusters || 0} clusters, ${counts.source_entities || 0} entities, ${counts.documents || 0} docs`
        );
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Refresh failed');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-slate-200 flex items-center gap-1 whitespace-nowrap"
        title="Refresh machine knowledge base from documents"
      >
        <RotateCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        Refresh Knowledge
      </button>
      {message && (
        <div className={`text-xs ${status === 'success' ? 'text-green-600' : 'text-red-600'} flex items-start gap-1`}>
          {status === 'success' ? (
            <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
          )}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
