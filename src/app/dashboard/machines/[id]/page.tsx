import { createClient } from '@/lib/supabase/server'
import { getCurrentUserFromSession } from '@/lib/auth-bridge'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { OverviewTab } from './tabs/OverviewTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { DiagnosticsTab } from './tabs/DiagnosticsTab'
import { MaintenanceTab } from './tabs/MaintenanceTab'
import { HistoryTab } from './tabs/HistoryTab'
import { PartsTab } from './tabs/PartsTab'
import { TicketsTab } from './tabs/TicketsTab'
import { PhotosTab } from './tabs/PhotosTab'
import { KnowledgeBaseTab } from './tabs/KnowledgeBaseTab'
import { AIInsights } from './tabs/AIInsights.client'
import { ProcedureEngine } from './tabs/ProcedureEngine.client'
import { TrainingEngine } from './tabs/TrainingEngine.client'
import { DiagnosticEngine } from './tabs/DiagnosticEngine.client'
import { CanonicalQueryPanel } from './components/CanonicalQueryPanel.client'
import { MachineMapTab } from './tabs/MachineMapTab'
import { CanonicalGraphRefreshButton } from './components/CanonicalGraphRefreshButton.client'
import { RefreshMachineKnowledgeButton } from './components/RefreshMachineKnowledgeButton.client'
import { BuildMachineKnowledgeButton } from './components/BuildMachineKnowledgeButton.client'

export default async function MachineDetailsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserFromSession()
  if (!user) return null

  const supabase = createClient()

  const { data: machine } = await supabase
    .from('machines')
    .select('*, documents:machine_documents(*)')
    .eq('id', params.id)
    .single()

  if (!machine) notFound()

  // Fetch KB summary for OverviewTab and PartsTab
  const { data: kb } = await supabase
    .from('machine_kb')
    .select('id, status, readiness_score')
    .eq('machine_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let kbSummary = null
  let kbParts: any[] = []

  if (kb) {
    // Fetch entity counts and canonical clusters
    const [partsRes, proceduresRes, faultsRes, docsRes, clustersRes] = await Promise.all([
      supabase.from('machine_kb_entities').select('*', { count: 'exact', head: true }).eq('kb_id', kb.id).eq('entity_type', 'part'),
      supabase.from('machine_kb_entities').select('*', { count: 'exact', head: true }).eq('kb_id', kb.id).eq('entity_type', 'procedure'),
      supabase.from('machine_kb_entities').select('*', { count: 'exact', head: true }).eq('kb_id', kb.id).eq('entity_type', 'fault_case'),
      supabase.from('machine_documents').select('*', { count: 'exact', head: true }).eq('machine_id', params.id),
      supabase.from('canonical_clusters').select('*', { count: 'exact', head: true }).eq('machine_id', params.id),
    ])

    const readiness = kb.readiness_score as any
    kbSummary = {
      kbStatus: kb.status,
      totalEntities: (partsRes.count ?? 0) + (proceduresRes.count ?? 0) + (faultsRes.count ?? 0),
      partsCount: partsRes.count ?? 0,
      proceduresCount: proceduresRes.count ?? 0,
      faultsCount: faultsRes.count ?? 0,
      documentsTotal: readiness?.total_documents ?? docsRes.count ?? 0,
      documentsProcessed: readiness?.successful_documents ?? 0,
      canonicalClusters: clustersRes.count ?? 0,
    }

    // Fetch KB parts for PartsTab (with first evidence item)
    const { data: partEntities } = await supabase
      .from('machine_kb_entities')
      .select('id, canonical_name, confidence, criticality, normalized_payload')
      .eq('kb_id', kb.id)
      .eq('entity_type', 'part')
      .order('canonical_name', { ascending: true })
      .limit(100)

    if (partEntities && partEntities.length > 0) {
      const entityIds = partEntities.map(e => e.id)
      const { data: evidenceRows } = await supabase
        .from('machine_kb_evidence')
        .select('entity_id, source_file_name, source_page, evidence_snippet')
        .in('entity_id', entityIds)
        .limit(200)

      const evidenceMap = new Map<string, any>()
      for (const ev of evidenceRows ?? []) {
        if (!evidenceMap.has(ev.entity_id)) evidenceMap.set(ev.entity_id, ev)
      }

      kbParts = partEntities.map(e => ({
        ...e,
        evidence_snippet: evidenceMap.get(e.id)?.evidence_snippet ?? null,
        source_page: evidenceMap.get(e.id)?.source_page ?? null,
      }))
    }
  }

  const tabStyle = "border-2 border-slate-700 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold px-5 py-2 uppercase text-xs"

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header className="flex justify-between items-end border-b-4 border-slate-700 pb-4">
        <div>
          <Badge className="mb-2 bg-blue-600 text-white border-none">{machine.serial_number}</Badge>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
            {machine.model ?? 'Device'}
          </h1>
          {machine.manufacturer && (
            <p className="text-sm text-slate-400 font-bold mt-1">{machine.manufacturer}</p>
          )}
        </div>
        <div className="text-right space-y-2">
          <div className="text-xs font-bold uppercase opacity-50">Status</div>
          <div className="text-xl font-black">{machine.status_client_facing ?? machine.status ?? 'N/A'}</div>
          <div className="space-y-2">
            <BuildMachineKnowledgeButton machineId={params.id} />
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-transparent flex flex-wrap gap-2 mb-8">
          <TabsTrigger value="overview" className={tabStyle}>Overview</TabsTrigger>
          <TabsTrigger value="documents" className={tabStyle}>Manuals ({machine.documents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="knowledge" className={tabStyle}>
            Knowledge
            {kbSummary && kbSummary.totalEntities != null && kbSummary.totalEntities > 0 && (
              <span className="ml-1.5 text-[9px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                {kbSummary.totalEntities}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="parts" className={tabStyle}>Parts</TabsTrigger>
          <TabsTrigger value="procedures" className={tabStyle}>Procedures</TabsTrigger>
          <TabsTrigger value="maintenance" className={tabStyle}>Maintenance</TabsTrigger>
          <TabsTrigger value="diagnostics" className={tabStyle}>Diagnostics</TabsTrigger>
          <TabsTrigger value="diagnostic-engine" className={tabStyle}>Diag Engine</TabsTrigger>
          <TabsTrigger value="tickets" className={tabStyle}>Tickets</TabsTrigger>
          <TabsTrigger value="history" className={tabStyle}>History</TabsTrigger>
          <TabsTrigger value="photos" className={tabStyle}>Photos</TabsTrigger>
          <TabsTrigger value="ai-insights" className={tabStyle}>AI Insights</TabsTrigger>
          <TabsTrigger value="training" className={tabStyle}>Training</TabsTrigger>
          <TabsTrigger value="canonical-search" className={tabStyle}>Canonical Search</TabsTrigger>
          <TabsTrigger value="machine-map" className={tabStyle}>Machine Map</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab machine={machine as any} userRole={user.role as any} kbSummary={kbSummary} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeBaseTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="parts">
          <PartsTab machineId={params.id} kbParts={kbParts} />
        </TabsContent>

        <TabsContent value="procedures">
          <ProcedureEngine machineId={params.id} />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="diagnostics">
          <DiagnosticsTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="diagnostic-engine">
          <DiagnosticEngine machineId={params.id} />
        </TabsContent>

        <TabsContent value="tickets">
          <TicketsTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="photos">
          <PhotosTab machineId={params.id} />
        </TabsContent>

        <TabsContent value="ai-insights">
          <AIInsights machineId={params.id} />
        </TabsContent>

        <TabsContent value="training">
          <TrainingEngine machineId={params.id} />
        </TabsContent>

        <TabsContent value="canonical-search">
          <CanonicalQueryPanel machineId={params.id} />
        </TabsContent>

        <TabsContent value="machine-map">
          <MachineMapTab machineId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
