import React from 'react';
import { createClient } from '@/lib/supabase/server';
import TechnicalVault from '@/components/machines/TechnicalVault';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, AlertCircle, FileText, Brain } from 'lucide-react';

export async function DocumentsTab({ machineId }: { machineId: string }) {
    const supabase = createClient();

    const [{ data: documents }, { data: kb }] = await Promise.all([
        supabase.from('machine_documents')
            .select('*')
            .eq('machine_id', machineId)
            .order('created_at', { ascending: false }),
        supabase.from('machine_kb')
            .select('id, status, readiness_score, updated_at')
            .eq('machine_id', machineId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    if (!documents || documents.length === 0) {
        return (
            <div className="p-12 text-center border-2 border-dashed rounded-xl border-slate-200 bg-white">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📁</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">No documents in the Technical Vault</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                    Upload technical manuals to enable AI metadata extraction and expert diagnostics.
                </p>
            </div>
        );
    }

    const indexed = documents.filter(d => d.processing_status?.toUpperCase() === 'INDEXED').length;
    const processing = documents.filter(d => ['processing', 'PROCESSING', 'pending', 'PENDING'].includes(d.processing_status ?? '')).length;
    const failed = documents.filter(d => ['failed', 'FAILED', 'error', 'ERROR'].includes(d.processing_status ?? '')).length;

    const readiness = kb?.readiness_score as any;
    const totalEntities = readiness ? ((readiness.parts_count ?? 0) + (readiness.procedures_count ?? 0) + (readiness.fault_cases_count ?? 0)) : null;

    return (
        <div className="space-y-4">
            {/* Pipeline Status Bar */}
            <div className="flex items-center gap-3 flex-wrap px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <FileText className="w-3.5 h-3.5" />
                    {documents.length} document{documents.length !== 1 ? 's' : ''}
                </div>
                <div className="h-4 w-px bg-slate-200" />
                {indexed > 0 && (
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-700">{indexed} indexed</span>
                    </div>
                )}
                {processing > 0 && (
                    <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        <span className="text-xs font-semibold text-amber-700">{processing} processing</span>
                    </div>
                )}
                {failed > 0 && (
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-semibold text-red-700">{failed} failed</span>
                    </div>
                )}
                {kb && (
                    <>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-semibold text-blue-700">
                                KB {kb.status ?? 'active'}
                                {totalEntities != null && totalEntities > 0 && ` · ${totalEntities} entities`}
                            </span>
                        </div>
                    </>
                )}
            </div>

            <TechnicalVault documents={documents.map(d => ({
                id: d.id,
                title: d.filename,
                file_url: d.storage_path,
                processing_status: d.processing_status || 'uploaded',
                type: d.document_type || 'other',
                page_count: d.page_count ?? null,
            }))} />
        </div>
    );
}
