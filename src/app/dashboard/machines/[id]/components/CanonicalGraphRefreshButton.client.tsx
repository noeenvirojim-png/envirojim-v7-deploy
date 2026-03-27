'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export function CanonicalGraphRefreshButton({ machineId }: { machineId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/machines/${machineId}/rebuild-canonical`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(
          `Rebuilt: ${data.counts.clusters || 0} clusters, ${Object.entries(data.counts)
            .filter(([k]) => k !== 'clusters' && k !== 'members')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}`
        );
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Unknown error');
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
        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 flex items-center gap-1 whitespace-nowrap"
        title="Rebuild canonical graph from source entities"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        Rebuild Graph
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
