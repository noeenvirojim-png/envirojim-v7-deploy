'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Lock, Eye, Download, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TechnicalDocument {
    id: string;
    title: string;
    file_url: string;
    processing_status: string;
    type: string;
    page_count?: number | null;
}

export default function TechnicalVault({ documents }: { documents: TechnicalDocument[] }) {
    const [selectedDoc, setSelectedDoc] = useState<TechnicalDocument | null>(documents[0] || null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredDocs = documents.filter(d => 
        d.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Card className="border-slate-200 bg-white shadow-xl overflow-hidden h-[800px] flex flex-col">
            <CardHeader className="border-b bg-slate-50/50 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Lock className="text-slate-400" size={20} />
                            Technical Vault
                        </CardTitle>
                        <CardDescription>Secure, read-only access to OEM documentation.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-slate-100 font-mono">
                        {documents.length} ASSETS SECURED
                    </Badge>
                </div>
            </CardHeader>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar: Document List */}
                <div className="w-80 border-r flex flex-col bg-white">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search manuals..." 
                                className="pl-8" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredDocs.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50 border-b ${
                                    selectedDoc?.id === doc.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : ''
                                }`}
                            >
                                <div className={`mt-1 p-2 rounded-lg ${
                                    selectedDoc?.id === doc.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate ${
                                        selectedDoc?.id === doc.id ? 'text-blue-900' : 'text-slate-700'
                                    }`}>
                                        {doc.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="secondary" className="text-[10px] px-1 h-4">
                                            {doc.type}
                                        </Badge>
                                        {(() => {
                                            const s = doc.processing_status?.toUpperCase();
                                            if (s === 'INDEXED') return <span className="text-[10px] font-semibold text-emerald-600">✓ AI Ready</span>;
                                            if (s === 'PROCESSING' || s === 'PENDING') return <span className="text-[10px] font-semibold text-amber-600">⟳ Processing</span>;
                                            if (s === 'FAILED' || s === 'ERROR') return <span className="text-[10px] font-semibold text-red-600">✗ Failed</span>;
                                            return <span className="text-[10px] text-slate-400">Uploaded</span>;
                                        })()}
                                        {doc.page_count != null && (
                                            <span className="text-[10px] text-slate-400">{doc.page_count}p</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 mt-2" />
                            </button>
                        ))}
                        {filteredDocs.length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No documents match your search.
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content: Document Viewer */}
                <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden relative">
                    {selectedDoc ? (
                        <>
                            <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-10">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-slate-800">{selectedDoc.title}</h3>
                                    <Badge className="bg-green-100 text-green-700 border-none">
                                        VERIFIED BY ENVIROJIM
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="text-slate-400 pointer-events-none">
                                        <Download size={14} className="mr-2" />
                                        Download Protected
                                    </Button>
                                    <Button size="sm" className="bg-slate-900 text-white gap-2">
                                        <Eye size={14} />
                                        Full Screen
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 p-8 overflow-hidden flex flex-col">
                                <div className="flex-1 bg-white rounded-xl shadow-inner border overflow-hidden relative group">
                                    {/* Secure Overlay to prevent context menu/save as simple hurdles */}
                                    <div className="absolute inset-0 z-20 pointer-events-none bg-transparent" 
                                         onContextMenu={(e) => e.preventDefault()} />
                                    
                                    <iframe
                                        src={`${selectedDoc.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                                        className="w-full h-full border-none"
                                        title={selectedDoc.title}
                                    />

                                    {/* Watermark */}
                                    <div className="absolute bottom-4 right-4 z-30 opacity-20 pointer-events-none select-none">
                                        <p className="text-4xl font-black text-slate-900 rotate-[-15deg]">
                                            ENVIROJIM SECURE
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Lock size={48} className="mb-4 opacity-20" />
                            <p>Select a document to view in the Technical Vault</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
