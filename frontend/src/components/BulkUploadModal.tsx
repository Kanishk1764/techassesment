'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, XCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { BatchQueueStatusResponse } from '../types';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  onCompleted: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  onCompleted,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<BatchQueueStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll batch status if activeBatchId is present
  useEffect(() => {
    if (!activeBatchId) return;

    let intervalId: any = null;
    const pollStatus = async () => {
      try {
        const res = await api.getBulkUploadStatus(jobId, activeBatchId);
        setQueueStatus(res);
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(intervalId);
          setIsUploading(false);
          onCompleted();
        }
      } catch (err: any) {
        console.error('Batch polling error:', err);
      }
    };

    pollStatus();
    intervalId = setInterval(pollStatus, 1500);

    return () => clearInterval(intervalId);
  }, [activeBatchId, jobId, onCompleted]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx' || ext === 'txt';
    });

    if (valid.length !== files.length) {
      setError('Some files were ignored because only .pdf, .docx, and .txt files are supported.');
    } else {
      setError(null);
    }

    const merged = [...selectedFiles, ...valid].slice(0, 20);
    if (merged.length >= 20) {
      setError('Maximum 20 resumes per batch upload.');
    }
    setSelectedFiles(merged);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedFiles.length === 0) {
      setError('Please select at least one resume file.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.bulkUploadCandidates(jobId, selectedFiles);
      if (res.batchId) {
        setActiveBatchId(res.batchId);
      }
    } catch (err: any) {
      setError(err.message || 'Bulk upload failed to enqueue.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bulk Resume Screener (Queue Worker)</h2>
              <p className="text-xs text-slate-400">Target Role: {jobTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!activeBatchId ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-950/30'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      addFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <div className="text-base font-bold text-white">
                  Drop multiple candidate resumes here
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Upload up to 20 files (.pdf, .docx, .txt). Names, emails, and credentials will be extracted automatically.
                </div>
              </div>

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Selected Files ({selectedFiles.length} / 20)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-slate-400 hover:text-rose-400 lowercase text-xs"
                    >
                      clear all
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="text-slate-200 truncate">{file.name}</span>
                          <span className="text-slate-500 text-[10px]">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Queue Progress View */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Progress Bar Header */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-white">
                    {queueStatus?.status === 'processing' ? (
                      <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                    ) : queueStatus?.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    )}
                    <span>
                      {queueStatus?.status === 'processing'
                        ? 'Queue Worker Processing Batch...'
                        : queueStatus?.status === 'completed'
                        ? 'Batch Intake Completed!'
                        : 'Queue Task Enqueued'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sky-400 text-sm">
                    {queueStatus?.progress || 0}%
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${queueStatus?.progress || 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Processed: <strong>{queueStatus?.processedCount || 0}</strong> of {queueStatus?.total || 0}
                  </span>
                  {queueStatus?.currentFile && (
                    <span className="truncate max-w-xs text-slate-300">
                      Active: <code className="text-sky-300">{queueStatus.currentFile}</code>
                    </span>
                  )}
                </div>
              </div>

              {/* Real-time Per-File Results List */}
              {queueStatus && queueStatus.results.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Processed Candidates ({queueStatus.results.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {queueStatus.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                          r.status === 'success'
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                            : 'bg-rose-950/20 border-rose-800/40 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {r.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-semibold text-white">{r.filename}</div>
                            {r.status === 'success' && r.candidate ? (
                              <div className="text-[11px] text-slate-400">
                                {r.candidate.name} ({r.candidate.email}) • Score:{' '}
                                <span className="font-bold text-sky-400">
                                  {r.candidate.evaluation?.matchScore ?? 0}/100
                                </span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-rose-400">{r.error}</div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            r.status === 'success'
                              ? 'bg-emerald-900/60 text-emerald-300'
                              : 'bg-rose-900/60 text-rose-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900 shrink-0">
          {!activeBatchId ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isUploading || selectedFiles.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enqueuing Batch...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Enqueue Batch Screening ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors"
            >
              {queueStatus?.status === 'completed' ? 'Done & View Ranked Candidates' : 'Close Window (Runs in Background)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
