import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Wrench, BookOpen, AlertTriangle, FileText, ChevronRight } from 'lucide-react';

type KbEntity = {
    id: string;
    entity_type: string;
    canonical_name: string;
    original_label: string;
    confidence: string;
    status: string;
    criticality: string;
    normalized_payload: any;
};

type KbEvidence = {
    id: string;
    entity_id: string;
    source_file_name: string;
    source_page: string;
    evidence_snippet: string;
    confidence: string;
};

const ENTITY_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
    part: { icon: Wrench, label: 'Parts', color: 'text-blue-700', bg: 'bg-blue-50' },
    procedure: { icon: BookOpen, label: 'Procedures', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    fault_case: { icon: AlertTriangle, label: 'Fault Cases', color: 'text-amber-700', bg: 'bg-amber-50' },
};

const confidenceBadge = (c: string) => {
    if (c === 'high') return 'border-green-200 text-green-700 bg-green-50';
    if (c === 'medium') return 'border-amber-200 text-amber-700 bg-amber-50';
    return 'border-slate-200 text-slate-600 bg-slate-50';
};

const criticalityBadge = (c: string) => {
    if (c === 'critical') return 'border-red-300 text-red-700 bg-red-50';
    if (c === 'high') return 'border-orange-200 text-orange-700 bg-orange-50';
    return '';
};

export async function KnowledgeBaseTab({ machineId }: { machineId: string }) {
    const supabase = createClient();

    // Fetch latest active KB for this machine
    const { data: kb } = await supabase
        .from('machine_kb')
        .select('id, status, version, readiness_score, machine_profile, coverage_report, created_at')
        .eq('machine_id', machineId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!kb) {
        return (
            <Card className="border-slate-200">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <Brain className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Knowledge Base Yet</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        Upload machine documents and run the intelligence pipeline to build a structured knowledge base
                        with parts, procedures, and fault case extraction.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Fetch entities grouped by type
    const { data: entities } = await supabase
        .from('machine_kb_entities')
        .select('id, entity_type, canonical_name, original_label, confidence, status, criticality, normalized_payload')
        .eq('kb_id', kb.id)
        .order('entity_type', { ascending: true })
        .order('canonical_name', { ascending: true })
        .limit(200);

    // Fetch evidence for all entities
    const entityIds = (entities ?? []).map(e => e.id);
    const { data: allEvidence } = entityIds.length > 0
        ? await supabase
            .from('machine_kb_evidence')
            .select('id, entity_id, source_file_name, source_page, evidence_snippet, confidence')
            .in('entity_id', entityIds)
            .limit(500)
        : { data: [] };

    const evidenceByEntity = new Map<string, KbEvidence[]>();
    for (const ev of (allEvidence ?? []) as KbEvidence[]) {
        const list = evidenceByEntity.get(ev.entity_id) ?? [];
        list.push(ev);
        evidenceByEntity.set(ev.entity_id, list);
    }

    // Group entities
    const grouped = new Map<string, KbEntity[]>();
    for (const entity of (entities ?? []) as KbEntity[]) {
        const list = grouped.get(entity.entity_type) ?? [];
        list.push(entity);
        grouped.set(entity.entity_type, list);
    }

    // KB summary stats
    const profile = kb.machine_profile as any;
    const coverage = kb.coverage_report as any;
    const readiness = kb.readiness_score as any;
    const totalEntities = (entities ?? []).length;
    const totalParts = grouped.get('part')?.length ?? 0;
    const totalProcedures = grouped.get('procedure')?.length ?? 0;
    const totalFaults = grouped.get('fault_case')?.length ?? 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KB Summary Header */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-slate-50/30">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-blue-600" />
                            Machine Knowledge Base
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">v{kb.version}</Badge>
                            <Badge variant="outline" className={
                                kb.status === 'active' ? 'border-green-200 text-green-700 bg-green-50' :
                                'border-amber-200 text-amber-700 bg-amber-50'
                            }>
                                {kb.status}
                            </Badge>
                        </div>
                    </div>
                    {profile?.machine_identity?.manufacturer && (
                        <CardDescription className="text-sm">
                            {profile.machine_identity.manufacturer} {profile.machine_identity.model}
                            {profile.machine_identity.serial_range ? ` — ${profile.machine_identity.serial_range}` : ''}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                            <p className="text-2xl font-black text-slate-900">{totalEntities}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Total Entities</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-blue-100">
                            <p className="text-2xl font-black text-blue-700">{totalParts}</p>
                            <p className="text-[10px] font-bold text-blue-500 uppercase">Parts</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-emerald-100">
                            <p className="text-2xl font-black text-emerald-700">{totalProcedures}</p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">Procedures</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border border-amber-100">
                            <p className="text-2xl font-black text-amber-700">{totalFaults}</p>
                            <p className="text-[10px] font-bold text-amber-500 uppercase">Fault Cases</p>
                        </div>
                    </div>
                    {readiness && typeof readiness === 'object' && (
                        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                            <span>Documents: {readiness.total_documents ?? '?'}</span>
                            <span>Processed: {readiness.successful_documents ?? '?'}/{readiness.total_documents ?? '?'}</span>
                            {readiness.success_rate != null && (
                                <span>Success Rate: {(Number(readiness.success_rate) * 100).toFixed(0)}%</span>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Entity Sections */}
            {['part', 'procedure', 'fault_case'].map(entityType => {
                const config = ENTITY_CONFIG[entityType] ?? { icon: FileText, label: entityType, color: 'text-slate-700', bg: 'bg-slate-50' };
                const items = grouped.get(entityType) ?? [];
                if (items.length === 0) return null;

                const Icon = config.icon;

                return (
                    <Card key={entityType} className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 bg-slate-50/50 border-b">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                {config.label}
                                <Badge variant="secondary" className="ml-2 text-xs">{items.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {items.map((entity) => {
                                    const evidence = evidenceByEntity.get(entity.id) ?? [];
                                    const payload = entity.normalized_payload as any;

                                    return (
                                        <div key={entity.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-sm text-slate-900 truncate">
                                                            {entity.canonical_name}
                                                        </h4>
                                                        <Badge variant="outline" className={`text-[10px] h-5 ${confidenceBadge(entity.confidence)}`}>
                                                            {entity.confidence}
                                                        </Badge>
                                                        {entity.criticality && entity.criticality !== 'medium' && entity.criticality !== 'low' && (
                                                            <Badge variant="outline" className={`text-[10px] h-5 ${criticalityBadge(entity.criticality)}`}>
                                                                {entity.criticality}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Part-specific details */}
                                                    {entityType === 'part' && payload?.part_number && (
                                                        <p className="text-xs font-mono text-slate-600 mt-1">
                                                            REF: {payload.part_number}
                                                            {payload.system && <span className="ml-3 text-slate-400">System: {payload.system}</span>}
                                                        </p>
                                                    )}

                                                    {/* Procedure-specific details */}
                                                    {entityType === 'procedure' && payload?.steps && Array.isArray(payload.steps) && (
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {payload.steps.length} step{payload.steps.length > 1 ? 's' : ''}
                                                            {payload.type && <span className="ml-2 capitalize">({payload.type})</span>}
                                                        </p>
                                                    )}

                                                    {/* Fault-specific details */}
                                                    {entityType === 'fault_case' && (
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {payload?.code && <span className="font-mono mr-2">Code: {payload.code}</span>}
                                                            {payload?.causes && Array.isArray(payload.causes) && (
                                                                <span>{payload.causes.length} cause{payload.causes.length > 1 ? 's' : ''}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Evidence snippets */}
                                                    {evidence.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {evidence.slice(0, 2).map((ev) => (
                                                                <div key={ev.id} className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 rounded px-2 py-1">
                                                                    <FileText className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                                                                    <span className="truncate">
                                                                        {ev.evidence_snippet ? `"${ev.evidence_snippet.slice(0, 120)}${ev.evidence_snippet.length > 120 ? '...' : ''}"` : ev.source_file_name}
                                                                    </span>
                                                                    {ev.source_page && (
                                                                        <Badge variant="outline" className="text-[9px] h-4 shrink-0 ml-auto border-slate-200">
                                                                            p.{ev.source_page}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {evidence.length > 2 && (
                                                                <p className="text-[10px] text-slate-400 pl-5">
                                                                    +{evidence.length - 2} more evidence source{evidence.length - 2 > 1 ? 's' : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
