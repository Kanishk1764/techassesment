'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { Candidate } from '../types';

interface CandidateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  onSuccess: (candidate: Candidate) => void;
}

export const CandidateUploadModal: React.FC<CandidateUploadModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamedSummary, setStreamedSummary] = useState('');
  const [streamStatus, setStreamStatus] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
      setError('Please upload a .pdf, .docx, or .txt file only.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds maximum size limit of 5MB.');
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select a resume file (.pdf, .docx, or .txt).');
      return;
    }

    try {
      setLoading(true);
      setStreamStatus('streaming');
      setStreamedSummary('Extracting credentials and evaluating resume with AI...');

      const formData = new FormData();
      formData.append('resume', selectedFile);

      // Backend extracts name, email, and experience automatically!
      const createdCandidate = await api.uploadCandidate(jobId, formData);

      if (createdCandidate && createdCandidate.id) {
        setStreamedSummary('');
        try {
          await api.streamSummary(
            jobId,
            createdCandidate.id,
            (chunk) => {
              setStreamedSummary((prev) => prev + chunk);
            },
            () => {
              setStreamStatus('done');
            },
            (err) => {
              console.warn('Streaming notice:', err);
              setStreamStatus('done');
            }
          );
        } catch {
          setStreamStatus('done');
        }
      }

      onSuccess(createdCandidate);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and screen resume.');
      setStreamStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Upload & Screen Candidate</h2>
              <p className="text-xs text-slate-400">Screening for: {jobTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Zero-Prompt File Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Resume Document (.pdf, .docx, or .txt) <span className="text-sky-400">*</span>
              </label>
              <span className="text-[11px] text-sky-400 font-semibold">✨ Auto-Extracts Name & Email</span>
            </div>
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
                  ? 'border-sky-500 bg-sky-950/30'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3 text-emerald-300">
                  <FileText className="w-10 h-10 text-emerald-400" />
                  <div className="text-left">
                    <div className="font-bold text-sm text-white truncate max-w-xs">{selectedFile.name}</div>
                    <div className="text-xs text-emerald-400/80">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Ready for AI analysis
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-slate-200">
                    Click to browse or drag & drop resume
                  </div>
                  <div className="text-xs text-slate-500">
                    Supported formats: .pdf, .docx, .txt (Max 5MB). No manual form entry required!
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streaming Summary Preview */}
          {streamStatus !== 'idle' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-sky-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-sky-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live AI Screening Stream
                </span>
                {streamStatus === 'streaming' && (
                  <span className="text-slate-400 text-[11px]">Evaluating credentials...</span>
                )}
                {streamStatus === 'done' && (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 font-mono leading-relaxed min-h-[48px]">
                {streamedSummary}
                {streamStatus === 'streaming' && <span className="animate-cursor" />}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-md shadow-sky-500/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Screening Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start AI Screener</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
