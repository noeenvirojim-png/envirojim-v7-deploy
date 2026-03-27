'use client';

import { useState } from 'react';
import { CanonicalQueryPanel } from './components/CanonicalQueryPanel.client';
import { DiagnosticPanel } from './components/DiagnosticPanel.client';

export default function MachinePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'search'>('diagnostic');

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Machine Intelligence
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Access machine knowledge base and diagnostic tools
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('diagnostic')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'diagnostic'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Diagnostic Mode
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'search'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          Knowledge Search
        </button>
      </div>

      {/* Content */}
      {activeTab === 'diagnostic' && <DiagnosticPanel machineId={params.id} />}
      {activeTab === 'search' && <CanonicalQueryPanel machineId={params.id} />}
    </div>
  );
}
