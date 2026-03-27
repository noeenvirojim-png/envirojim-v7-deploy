'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, AlertTriangle, ShieldCheck, Zap, Brain, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step {
  id: string;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface MachineIngestionStatusPanelProps {
  runId: string;
}

const PHASES = [
  { id: 'inventory', label: 'Document Inventory', icon: Zap },
  { id: 'extract', label: 'AI Deep Extraction', icon: Brain },
  { id: 'consolidate', label: 'Knowledge Consolidation', icon: GitBranch },
  { id: 'graph', label: 'System Graph Build', icon: GitBranch },
  { id: 'audit', label: 'Quality Audit', icon: ShieldCheck },
  { id: 'finalize', label: 'Intelligence Mapping', icon: CheckCircle2 }
];

export function MachineIngestionStatusPanel({ runId }: MachineIngestionStatusPanelProps) {
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/machines/ingestion/${runId}/status`);
        const data = await res.json();
        setRun(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Polling error:', e);
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(poll, 3000);
    poll();
    return () => clearInterval(interval);
  }, [runId]);

  if (loading && !run) {
    return (
      <Card className="border-slate-100 shadow-sm bg-slate-50/50 animate-pulse">
        <CardContent className="py-10 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-slate-300 mb-4" size={32} />
          <p className="text-slate-400 text-sm">Initializing Intelligence Pipeline...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-100 shadow-md bg-white overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Brain className="text-indigo-600" size={20} />
              AI Intelligence Pipeline
            </CardTitle>
            <CardDescription>Real-time machine mental map construction</CardDescription>
          </div>
          <Badge variant={run?.status === 'completed' ? 'success' : (run?.status === 'failed' ? 'destructive' : 'secondary')} className="px-3 py-1">
            {run?.status?.toUpperCase() || 'INITIALIZING'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {PHASES.map((phase, idx) => {
            const isCurrent = run?.current_phase?.toLowerCase()?.includes(phase.id);
            const isCompleted = PHASES.findIndex(p => run?.current_phase?.toLowerCase()?.includes(p.id)) > idx || run?.status === 'completed';
            
            return (
              <div key={phase.id} className="flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500
                  ${isCompleted ? 'bg-green-100 border-green-500 text-green-600' : (isCurrent ? 'bg-indigo-50 border-indigo-500 text-indigo-600 animate-pulse' : 'border-slate-100 text-slate-300')}`}>
                  {isCompleted ? <CheckCircle2 size={16} /> : <phase.icon size={16} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between font-medium text-slate-700">
                    <span>{phase.label}</span>
                    {isCurrent && <span className="text-xs text-indigo-500 animate-pulse font-bold tracking-widest uppercase">Processing...</span>}
                  </div>
                  {isCurrent && (
                    <p className="text-xs text-slate-500 mt-1">Analyzing evidence and cross-referencing technical data.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {run?.status === 'completed' && (
          <div className="mt-8 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 animate-in fade-in duration-700">
            <ShieldCheck className="text-green-600" size={24} />
            <div>
              <p className="text-sm font-bold text-green-900">Pipeline Harmonized</p>
              <p className="text-xs text-green-700">The machine mental map is now active and ready for diagnostics.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
