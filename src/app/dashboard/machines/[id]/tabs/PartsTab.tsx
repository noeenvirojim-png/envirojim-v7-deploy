'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Box, Send, Loader2, Wrench, CheckCircle, ShoppingCart, FileText, Package } from 'lucide-react';
import { getPartsSuggestions, createPredictiveChecklist, PartsSuggestionResult } from '@/domain/assets/actions/parts';
import { requestPartFromKB } from '@/domain/procurement/actions/requestFromKB';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { enrichPartForProcurement } from '@/domain/procurement/transformers';
import { requestEnrichedPart } from '@/domain/procurement/actions/request-enriched-part';

type KbPart = {
    id: string;
    canonical_name: string;
    confidence: string;
    criticality: string;
    normalized_payload: any;
    evidence_snippet?: string;
    source_page?: string;
};

type ReviewRow = {
    id: string;
    raw_designation: string;
    raw_part_number: string;
    part_number_raw: string;
    designation_raw: string;
    source_page: number;
    evidence_snippet: string;
    validation_status: string;
    parts_review_decisions?: Array<{
        id: string;
        decision_status: string;
        corrected_part_number?: string;
        corrected_designation?: string;
        corrected_qty?: number;
        corrected_notes?: string;
        rationale?: string;
        is_active: boolean;
        created_at?: string;
    }>;
};

export function PartsTab({ machineId, kbParts }: { machineId: string; kbParts?: KbPart[] }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PartsSuggestionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [generatingChecklist, setGeneratingChecklist] = useState(false);
    const [checklistCreated, setChecklistCreated] = useState(false);
    const [requestingPart, setRequestingPart] = useState<string | null>(null);
    const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [counts, setCounts] = useState({ validated: 0, needs_review: 0, rejected: 0, reviewed: 0 });

    // Enrich KB parts with procurement metadata
    const enrichedKbParts = React.useMemo(() =>
        (kbParts || []).map(part => ({
            ...part,
            _enriched: enrichPartForProcurement({
                part_name: part.canonical_name,
                machine_id: machineId,
                confidence: parseInt(part.confidence || '75'),
                evidence_summary: part.evidence_snippet || part.source_page || 'From KB',
            }, 'ai_kb'),
        })),
        [kbParts, machineId]
    );

    // Load review rows on mount
    React.useEffect(() => {
        const loadReviewRows = async () => {
            try {
                setReviewLoading(true);
                const { createClient } = await import('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
                );

                const { data, error } = await supabase
                    .from('parts_extraction_rows')
                    .select(`
                        id,
                        raw_designation:designation_raw,
                        raw_part_number:part_number_raw,
                        source_page,
                        evidence_snippet,
                        validation_status,
                        parts_review_decisions!left(
                            id,
                            decision_status,
                            corrected_part_number,
                            corrected_designation,
                            corrected_qty,
                            corrected_notes,
                            rationale,
                            is_active,
                            created_at
                        )
                    `)
                    .eq('machine_id', machineId)
                    .order('source_page', { ascending: true });

                if (!error && data) {
                    setReviewRows(data as ReviewRow[]);

                    // Calculate counts
                    let validated = 0, needs = 0, rejected = 0, reviewed = 0;
                    for (const row of data as ReviewRow[]) {
                        if (row.validation_status === 'VALIDATED') validated++;
                        else if (row.validation_status === 'NEEDS_REVIEW') {
                            const activeDecision = row.parts_review_decisions?.find(d => d.is_active);
                            if (activeDecision && ['APPROVED', 'CORRECTED'].includes(activeDecision.decision_status)) {
                                reviewed++;
                            } else {
                                needs++;
                            }
                        } else if (row.validation_status === 'REJECTED') rejected++;
                    }
                    setCounts({ validated, needs_review: needs, rejected, reviewed });
                }
            } catch (err) {
                console.error('Failed to load review rows:', err);
            } finally {
                setReviewLoading(false);
            }
        };

        loadReviewRows();
    }, [machineId]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResults(null);
        setChecklistCreated(false);
        try {
            const res = await getPartsSuggestions({ machine_id: machineId, query });
            if (res.success && res.result) {
                setResults(res.result);
            } else {
                toast.error(res.error || "Erreur lors de l'analyse IA");
            }
        } catch (error) {
            toast.error("Erreur serveur lors de la requête IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateChecklist = async () => {
        if (!results?.predictive_checklist) return;
        setGeneratingChecklist(true);
        try {
            const res = await createPredictiveChecklist(machineId, results.predictive_checklist);
            if (res.success) {
                setChecklistCreated(true);
                toast.success("Checklist prédictive générée avec succès !");
            } else {
                toast.error("Échec de la génération de la checklist");
            }
        } finally {
            setGeneratingChecklist(false);
        }
    };

    const handleRequestPart = async (partNumber: string, partName: string) => {
        setRequestingPart(partNumber);
        try {
            const res = await requestPartFromKB({
                machineId,
                partNumber,
                partName,
                quantity: 1,
                urgency: 'normal',
            });
            if (res.success) {
                toast.success(`Demande créée pour ${partName} — visible dans Commandes`);
            } else {
                toast.error(res.error || 'Erreur lors de la création de la demande');
            }
        } catch {
            toast.error('Erreur serveur');
        } finally {
            setRequestingPart(null);
        }
    };

    const getDecisionBadge = (row: ReviewRow) => {
        const activeDecision = row.parts_review_decisions?.find(d => d.is_active);
        if (!activeDecision) {
            return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Open Review</Badge>;
        }
        switch (activeDecision.decision_status) {
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
            case 'CORRECTED':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Corrected</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
            case 'ESCALATED':
                return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Escalated</Badge>;
            default:
                return null;
        }
    };

    const handleRequestSuggestedPart = async (name: string, number: string) => {
        setRequestingPart(number);
        try {
            const res = await requestPartFromKB({
                machineId,
                partNumber: number,
                partName: name,
                quantity: 1,
                urgency: 'normal',
                notes: `Demande via recherche IA: "${query}"`,
            });
            if (res.success) {
                toast.success(`Demande créée pour ${name}`);
            } else {
                toast.error(res.error || 'Erreur');
            }
        } catch {
            toast.error('Erreur serveur');
        } finally {
            setRequestingPart(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* AI Search Section */}
            <Card>
                <CardHeader className="bg-slate-50 border-b border-slate-100 rounded-t-xl">
                    <CardTitle className="flex items-center text-blue-800">
                        <Box className="w-5 h-5 mr-2 text-blue-600" />
                        Copilote Pièces & Maintenance
                    </CardTitle>
                    <CardDescription>
                        Recherche en langage naturel. L'IA consulte le manuel et les heures machine pour recommander les bonnes références.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-3 relative">
                        <Input
                            placeholder='Ex: "filtres pour la révision des 500h" ou "pièces convoyeur avant droit"'
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={loading}
                            className="pr-12 text-base h-12 rounded-xl shadow-sm border-slate-300 focus-visible:ring-blue-500"
                        />
                        <Button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="absolute right-1 top-1 h-10 w-10 p-0 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="animate-pulse font-medium">L'IA analyse le manuel et croise les références...</p>
                </div>
            )}

            {/* AI Search Results */}
            {results && !loading && (
                <div className="grid lg:grid-cols-2 gap-6 items-start animate-in slide-in-from-bottom-4">
                    <Card className="border-blue-100 shadow-md">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-lg">Pièces Recommandées</CardTitle>
                            {results.confirmation_prompt && (
                                <CardDescription className="text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2 font-medium">
                                    {results.confirmation_prompt}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4 p-0">
                            {results.suggested_parts.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {results.suggested_parts.map((p, i) => (
                                        <div key={i} className="flex items-start justify-between p-4 hover:bg-slate-50 transition-colors gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-800">{p.name}</h4>
                                                    <Badge variant="outline" className={p.confidence > 80 ? 'border-green-200 text-green-700 bg-green-50' : 'border-amber-200 text-amber-700 bg-amber-50'}>
                                                        {p.confidence}%
                                                    </Badge>
                                                </div>
                                                <div className="text-sm font-mono text-slate-600 mb-1">REF: {p.number}</div>
                                                <div className="text-xs text-slate-500 uppercase font-semibold">{p.manufacturer}</div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="shrink-0 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                                disabled={requestingPart === p.number}
                                                onClick={() => handleRequestSuggestedPart(p.name, p.number)}
                                            >
                                                {requestingPart === p.number ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <><ShoppingCart className="w-3 h-3 mr-1" /> Commander</>
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-500 italic">Aucune pièce exacte identifiée.</div>
                            )}
                        </CardContent>
                    </Card>

                    {results.predictive_checklist && results.predictive_checklist.length > 0 && (
                        <Card className="border-emerald-100 shadow-md bg-emerald-50/30">
                            <CardHeader className="pb-3 border-b border-emerald-100/50">
                                <CardTitle className="text-lg flex items-center text-emerald-800">
                                    <Wrench className="w-5 h-5 mr-2" />
                                    Checklist Prédictive
                                </CardTitle>
                                <CardDescription className="text-emerald-700">
                                    Intervention suggérée en fonction des pièces demandées et de l'état machine.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 p-0">
                                <div className="divide-y divide-emerald-100/50 px-4">
                                    {results.predictive_checklist.map((task, i) => (
                                        <div key={i} className="py-3 flex items-start">
                                            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 mr-3 shrink-0" />
                                            <div>
                                                <h5 className="font-medium text-slate-800 text-sm">{task.description}</h5>
                                                {task.scheduled_hours > 0 && (
                                                    <Badge variant="secondary" className="mt-1 bg-white text-xs text-slate-500">Prévu à {task.scheduled_hours}h</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 bg-white/50 border-t border-emerald-100/50 mt-2 rounded-b-xl flex justify-end">
                                    <Button
                                        variant="default"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={handleGenerateChecklist}
                                        disabled={generatingChecklist || checklistCreated}
                                    >
                                        {generatingChecklist ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
                                        {checklistCreated ? 'Checklist Associée' : 'Générer la Checklist'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Parts Review Queue Section */}
            {!reviewLoading && reviewRows.length > 0 && (
                <Card className="border-orange-100 shadow-sm">
                    <CardHeader className="pb-3 bg-orange-50/50 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-orange-600" />
                                <CardTitle className="text-base">Parts Review Queue</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">{counts.validated} Validated</Badge>
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">{counts.needs_review} Needs Review</Badge>
                                {counts.reviewed > 0 && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">{counts.reviewed} Reviewed</Badge>}
                                {counts.rejected > 0 && <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">{counts.rejected} Rejected</Badge>}
                            </div>
                        </div>
                        <CardDescription className="mt-2">
                            Parts awaiting human review and decision from extraction. Raw values shown — corrections displayed when marked.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-orange-100">
                            {reviewRows.map((row) => {
                                const activeDecision = row.parts_review_decisions?.find(d => d.is_active);
                                const rawDesignation = row.raw_designation || row.designation_raw;
                                const rawPartNumber = row.raw_part_number || row.part_number_raw;

                                return (
                                    <div key={row.id} className="flex items-start justify-between p-4 hover:bg-orange-50/30 transition-colors gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h4 className="font-bold text-sm text-slate-900">{rawDesignation || 'Unknown'}</h4>
                                                {getDecisionBadge(row)}
                                            </div>
                                            <p className="text-xs font-mono text-slate-600 mb-2">REF: {rawPartNumber || 'N/A'} | Page {row.source_page}</p>

                                            {/* Show evidence snippet */}
                                            {row.evidence_snippet && (
                                                <div className="flex items-start gap-1.5 mb-2 text-[11px] text-slate-500 bg-slate-50 rounded px-2 py-1">
                                                    <FileText className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                                                    <span className="truncate">"{row.evidence_snippet.slice(0, 100)}{row.evidence_snippet.length > 100 ? '...' : ''}"</span>
                                                </div>
                                            )}

                                            {/* Show corrected values if exists */}
                                            {activeDecision && activeDecision.decision_status === 'CORRECTED' && (
                                                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 text-[11px]">
                                                    <p className="font-semibold text-blue-900">Corrected:</p>
                                                    {activeDecision.corrected_part_number && (
                                                        <p className="text-blue-800 font-mono">REF: {activeDecision.corrected_part_number}</p>
                                                    )}
                                                    {activeDecision.corrected_designation && (
                                                        <p className="text-blue-800">{activeDecision.corrected_designation}</p>
                                                    )}
                                                    {activeDecision.rationale && (
                                                        <p className="text-blue-700 italic mt-1">Reason: {activeDecision.rationale}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* KB Extracted Parts Section */}
            {kbParts && kbParts.length > 0 && (
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 bg-slate-50/50 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            Pièces Extraites du Manuel
                            <Badge variant="secondary" className="ml-2 text-xs">{kbParts.length}</Badge>
                        </CardTitle>
                        <CardDescription>
                            Pièces identifiées automatiquement dans les documents techniques de cette machine.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {kbParts.map((part) => {
                                const payload = part.normalized_payload as any;
                                const partNumber = payload?.part_number || 'N/A';
                                const partName = part.canonical_name;

                                return (
                                    <div key={part.id} className="flex items-start justify-between p-4 hover:bg-slate-50/50 transition-colors gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-sm text-slate-900">{partName}</h4>
                                                <Badge variant="outline" className={`text-[10px] h-5 ${
                                                    part.confidence === 'high' ? 'border-green-200 text-green-700 bg-green-50' :
                                                    part.confidence === 'medium' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                    'border-slate-200 text-slate-500'
                                                }`}>
                                                    {part.confidence}
                                                </Badge>
                                            </div>
                                            <p className="text-xs font-mono text-slate-600 mt-0.5">REF: {partNumber}</p>
                                            {part.evidence_snippet && (
                                                <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-slate-500 bg-slate-50 rounded px-2 py-1">
                                                    <FileText className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                                                    <span className="truncate">"{part.evidence_snippet.slice(0, 100)}{part.evidence_snippet.length > 100 ? '...' : ''}"</span>
                                                    {part.source_page && (
                                                        <Badge variant="outline" className="text-[9px] h-4 shrink-0 ml-auto border-slate-200">p.{part.source_page}</Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                            disabled={requestingPart === part.id}
                                            onClick={() => handleRequestPart(partNumber, partName)}
                                        >
                                            {requestingPart === part.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <><ShoppingCart className="w-3 h-3 mr-1" /> Commander</>
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
