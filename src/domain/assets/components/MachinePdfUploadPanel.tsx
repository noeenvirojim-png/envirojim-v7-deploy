'use client';

import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const MAX_FILES = 35;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface MachinePdfUploadPanelProps {
  onUploadComplete: (documents: any[]) => void;
  machineId?: string;
}

export function MachinePdfUploadPanel({ onUploadComplete, machineId }: MachinePdfUploadPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const addFiles = (incoming: File[]) => {
    setError(null);

    const validPdfs = incoming.filter(file => file.type === 'application/pdf');
    const oversized = validPdfs.find(file => file.size > MAX_FILE_SIZE);

    if (oversized) {
      setError(`${oversized.name} exceeds the 10MB per-file limit.`);
      return;
    }

    setFiles(previous => {
      const combined = [...previous, ...validPdfs];
      if (combined.length > MAX_FILES) {
        setError(`A maximum of ${MAX_FILES} PDF documents can be uploaded at once.`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragLeave = () => {
    setIsDragActive(false);
  };

  const removeFile = (index: number) => {
    setFiles(previous => previous.filter((_, fileIndex) => fileIndex !== index));
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      if (!data.count) {
        throw new Error('No PDF document was accepted by the server');
      }

      setProgress(100);
      onUploadComplete(data.documents);
      setFiles([]);
    } catch (uploadError: any) {
      setError(uploadError.message || 'Upload failed');
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
          onChange={(event) => addFiles(Array.from(event.target.files || []))}
        />
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-slate-400">
            <Upload size={24} />
          </div>
          <p className="font-medium text-slate-900">
            {isDragActive ? 'Drop your PDFs here' : 'Drag & Drop machine manuals'}
          </p>
          <p className="text-sm text-slate-500 mt-1">Up to 35 PDFs, maximum 10MB each</p>
          <Button variant="secondary" size="sm" className="mt-4 shadow-sm" type="button">
            Browse Files
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <Card className="border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="text-red-500" size={18} />
                    <div>
                      <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="text-slate-300 hover:text-red-500 transition-colors">
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
