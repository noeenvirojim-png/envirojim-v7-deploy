'use client';

import { useState } from 'react';
import { Zap, AlertTriangle, Wrench, Search, BookOpen, ShoppingCart, Brain, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { BuildMachineKnowledgeButton } from './BuildMachineKnowledgeButton.client';

interface KbData {
  documentsTotal?: number;
  totalEntities?: number;
  partsCount?: number;
  proceduresCount?: number;
  faultsCount?: number;
  canonicalClusters?: number;
}

export function MachineActionCenter({ machineId, kbData }: { machineId: string; kbData?: KbData }) {
  const hasDocs = (kbData?.documentsTotal ?? 0) > 0;
  const hasEntities = (kbData?.totalEntities ?? 0) > 0;
  const hasCanonical = (kbData?.canonicalClusters ?? 0) > 0;
  const buildNeeded = hasDocs && !hasCanonical;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Machine Action Center</h3>
            <p className="text-xs text-slate-500">Quick access to diagnostics and actions</p>
          </div>
        </div>

        {/* Knowledge Build Status Indicator */}
        {hasDocs && (
          <div className="flex items-center gap-2">
            {hasCanonical ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Knowledge Ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Needs Build</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <a href="#diagnostics" className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition text-center cursor-pointer">
          <AlertTriangle className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
          <div className="text-xs font-semibold text-slate-900 dark:text-white">Diagnostic</div>
          <div className="text-[10px] text-slate-500">Query KB</div>
        </a>

        <a href="#canonical-search" className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition text-center cursor-pointer">
          <Search className="h-4 w-4 text-blue-600 mx-auto mb-1" />
          <div className="text-xs font-semibold text-slate-900 dark:text-white">Search</div>
          <div className="text-[10px] text-slate-500">Knowledge</div>
        </a>

        <a href="#maintenance" className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 transition text-center cursor-pointer">
          <Wrench className="h-4 w-4 text-amber-600 mx-auto mb-1" />
          <div className="text-xs font-semibold text-slate-900 dark:text-white">Maintenance</div>
          <div className="text-[10px] text-slate-500">View tasks</div>
        </a>

        <button className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-500 transition text-center">
          <ShoppingCart className="h-4 w-4 text-red-600 mx-auto mb-1" />
          <div className="text-xs font-semibold text-slate-900 dark:text-white">Request</div>
          <div className="text-[10px] text-slate-500">Part</div>
        </button>
      </div>

      {/* Build Knowledge CTA */}
      {buildNeeded && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-amber-600" />
            <div className="text-sm">
              <div className="font-semibold text-amber-900 dark:text-amber-200">Build Machine Knowledge</div>
              <div className="text-xs text-amber-700 dark:text-amber-300">{kbData?.documentsTotal} document(s) ready to process</div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <BuildMachineKnowledgeButton machineId={machineId} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-300 dark:border-slate-600">
        <div className="text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{kbData?.partsCount ?? 0}</div>
          <div className="text-[10px] text-slate-500 uppercase">Parts</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{kbData?.faultsCount ?? 0}</div>
          <div className="text-[10px] text-slate-500 uppercase">Faults</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{kbData?.proceduresCount ?? 0}</div>
          <div className="text-[10px] text-slate-500 uppercase">Procedures</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{kbData?.canonicalClusters ?? 0}</div>
          <div className="text-[10px] text-slate-500 uppercase">Clusters</div>
        </div>
      </div>
    </div>
  );
}
