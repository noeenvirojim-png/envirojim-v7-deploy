'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FlowsPage() {
  const [machineSlug, setMachineSlug] = useState('VB750');
  const [problem, setProblem] = useState('Motor overheating');
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [procurement, setProcurement] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeDiagnostic = async () => {
    setLoading('diagnostic');
    setError(null);
    try {
      const res = await fetch('/api/machines/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_slug: machineSlug, problem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setDiagnostic(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const executeMaintenance = async () => {
    setLoading('maintenance');
    setError(null);
    try {
      const res = await fetch('/api/machines/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_slug: machineSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMaintenance(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  const executeProcurement = async () => {
    setLoading('procurement');
    setError(null);
    try {
      // Get parts first to have IDs for procurement
      const res = await fetch('/api/machines/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_slug: machineSlug, problem: 'Conveyor jammed' }),
      });
      const diag = await res.json();
      const partIds = diag.canonical_parts_matched?.slice(0, 2).map((p: any) => p.part_id) || [];

      const procRes = await fetch('/api/machines/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_slug: machineSlug, selected_part_ids: partIds }),
      });
      const procData = await procRes.json();
      if (!procRes.ok) throw new Error(procData.error || 'Failed');
      setProcurement(procData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Machine Flows UI Test</h1>
        <p className="text-slate-500">Test diagnostic, maintenance, and procurement flows</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Machine Slug</label>
          <input
            type="text"
            value={machineSlug}
            onChange={(e) => setMachineSlug(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="VB750"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Problem</label>
          <input
            type="text"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Motor overheating"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagnostic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={executeDiagnostic}
              disabled={loading === 'diagnostic'}
              className="w-full"
            >
              {loading === 'diagnostic' ? 'Running...' : 'Execute'}
            </Button>
            {diagnostic && (
              <div className="text-sm bg-slate-50 p-3 rounded">
                <div className="font-mono">
                  <div>Problem: {diagnostic.problem}</div>
                  <div>Parts matched: {diagnostic.parts_count}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    {diagnostic.runtime_truth_source}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={executeMaintenance}
              disabled={loading === 'maintenance'}
              className="w-full"
            >
              {loading === 'maintenance' ? 'Running...' : 'Execute'}
            </Button>
            {maintenance && (
              <div className="text-sm bg-slate-50 p-3 rounded">
                <div className="font-mono">
                  <div>Tasks: {maintenance.tasks?.length || 0}</div>
                  <div>Total parts: {maintenance.total_required_parts}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    {maintenance.runtime_truth_source}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Procurement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={executeProcurement}
              disabled={loading === 'procurement'}
              className="w-full"
            >
              {loading === 'procurement' ? 'Running...' : 'Execute'}
            </Button>
            {procurement && (
              <div className="text-sm bg-slate-50 p-3 rounded">
                <div className="font-mono">
                  <div>Order ID: {procurement.order_id?.substring(0, 12)}...</div>
                  <div>Items: {procurement.items_count}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    {procurement.write_executed ? '✓ Write executed' : 'Structure only'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
