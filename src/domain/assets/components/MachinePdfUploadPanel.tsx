'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface MachinePdfUploadPanelProps {
  onUploadComplete: (documents: any[]) => void;
  machineId?: string;
}

export function MachinePdfUploadPanel({ onUploadComplete, machineId }: MachinePdfUploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = () => {
    setIsDragActive(false);
  };

  const [isDragActive, setIsDragActive] = useState(false);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!machineId) {
      setError('Machine must be created first');
      return;
    }
    if (files.length === 0) return;

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`/api/machines/${machineId}/documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setProgress(100);
      onUploadComplete(data.documents);
      setFiles([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`}
        onClick={() => document.getElementById('pdf-input')?.click()}
      >
        <input 
          id="pdf-input"
          type="file" 
          multiple 
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const selectedFiles = Array.from(e.target.files || []);
            setFiles(prev => [...prev, ...selectedFiles]);
          }}
        />
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-slate-400">
            <Upload size={24} />
          </div>
          <p className="font-medium text-slate-900">
            {isDragActive ? 'Drop your PDFs here' : 'Drag & Drop machine manuals'}
          </p>
          <p className="text-sm text-slate-500 mt-1">Up to 35 PDFs, max 50MB each</p>
          <Button variant="secondary" size="sm" className="mt-4 shadow-sm" type="button">
            Browse Files
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <Card className="border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {files.map((file, i) => (
                <li key={i} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="text-red-500" size={18} />
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{files.length} documents selected</span>
              <Button 
                onClick={handleUpload} 
                disabled={uploading || !machineId} 
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800"
                type="button"
              >
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                ) : 'Upload to Intelligence Vault'}
              </Button>
            </div>
          </CardContent>
          {uploading && <Progress value={progress} className="h-1 rounded-none" />}
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
