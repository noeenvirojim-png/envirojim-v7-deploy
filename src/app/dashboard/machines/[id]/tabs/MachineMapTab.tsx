'use client';

import { useState, useEffect } from 'react';
import { Zap, Wrench, AlertTriangle, Package, Search, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizeClusterForDisplay, filterParasiticClusters, deduplicateByDisplayName } from '@/lib/machines/intelligence/DisplayNormalizer';

interface SystemNode {
  id: string;
  name: string;
  type: string;
  partsCount: number;
  maintenanceCount: number;
  faultsCount: number;
}

export function MachineMapTab({ machineId }: { machineId: string }) {
  const [systems, setSystems] = useState<SystemNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const supabase = createClient();

        const { data: clusters } = await supabase
          .from('canonical_clusters')
          .select('id, canonical_name, cluster_type, confidence')
          .eq('machine_id', machineId)
          .eq('cluster_type', 'system')
          .order('canonical_name')
          .limit(20);

        if (!clusters) {
          setSystems([]);
          setLoading(false);
          return;
        }

        // Load aliases for display normalization
        const clusterIds = clusters.map(c => c.id);
        const { data: allAliases = [] } = await supabase
          .from('canonical_cluster_aliases')
          .select('cluster_id, alias')
          .in('cluster_id', clusterIds);

        const aliasesByClusterId: Record<string, string[]> = {};
        for (const alias of allAliases) {
          if (!aliasesByClusterId[alias.cluster_id]) {
            aliasesByClusterId[alias.cluster_id] = [];
          }
          aliasesByClusterId[alias.cluster_id].push(alias.alias);
        }

        const { data: links } = await supabase
          .from('canonical_cluster_links')
          .select('from_cluster_id, c2:canonical_clusters!to_cluster_id(cluster_type)')
          .in('from_cluster_id', clusterIds);

        // Normalize and filter clusters
        let systemsWithCounts = clusters.map(c => {
          const normalized = normalizeClusterForDisplay(
            { id: c.id, canonical_name: c.canonical_name, cluster_type: c.cluster_type, confidence: c.confidence, member_count: 0 },
            aliasesByClusterId[c.id] || []
          );
          const linkedItems = links?.filter(l => l.from_cluster_id === c.id) || [];
          return {
            id: normalized.id,
            name: normalized.display_name,
            display_name: normalized.display_name,  // For dedup functions
            type: normalized.cluster_type,
            partsCount: linkedItems.filter(l => l.c2?.cluster_type === 'part').length,
            maintenanceCount: linkedItems.filter(l => l.c2?.cluster_type === 'maintenance_target').length,
            faultsCount: linkedItems.filter(l => l.c2?.cluster_type === 'fault_target').length,
          };
        });

        // Filter parasitic names and deduplicate
        systemsWithCounts = filterParasiticClusters(systemsWithCounts);
        systemsWithCounts = deduplicateByDisplayName(systemsWithCounts);

        setSystems(systemsWithCounts);
      } catch (err) {
        setError('Failed to load machine map');
      } finally {
        setLoading(false);
      }
    };

    loadSystems();
  }, [machineId]);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading machine map...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  if (systems.length === 0) {
    return <div className="text-center py-12 text-slate-500">No systems found in knowledge base</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Machine Systems Map</h2>
        <span className="ml-auto text-xs font-medium text-slate-500">{systems.length} systems</span>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map((system) => (
          <div key={system.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition">
            {/* System Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <Zap className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{system.name}</h3>
                <p className="text-xs text-slate-500 mt-1">System</p>
              </div>
            </div>

            {/* Related Items */}
            <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              {system.partsCount > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mx-auto mb-1">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{system.partsCount}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Parts</div>
                </div>
              )}

              {system.maintenanceCount > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center h-8 w-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg mx-auto mb-1">
                    <Package className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{system.maintenanceCount}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Maint.</div>
                </div>
              )}

              {system.faultsCount > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{system.faultsCount}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Faults</div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 text-xs">
              <button className="flex-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium flex items-center justify-center gap-1">
                <Search className="h-3 w-3" />
                Diagnose
              </button>
              <button className="flex-1 px-2 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 font-medium flex items-center justify-center gap-1">
                <Download className="h-3 w-3" />
                Sources
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-600 dark:text-slate-400">
        <strong>{systems.reduce((sum, s) => sum + s.partsCount + s.maintenanceCount + s.faultsCount, 0)}</strong> total relationships mapped across <strong>{systems.length}</strong> systems
      </div>
    </div>
  );
}
