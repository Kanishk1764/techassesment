import React, { useState } from 'react';
import { X, Terminal, Copy, Check } from 'lucide-react';
import { Candidate } from '../types';

interface RawLlmDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
}

export const RawLlmDebugModal: React.FC<RawLlmDebugModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  const [copiedSection, setCopiedSection] = useState<'prompt' | 'response' | null>(null);

  if (!isOpen) return null;

  const rawPrompt = candidate.evaluation?.rawPrompt || 'No raw prompt stored for this evaluation.';
  const rawResponse = candidate.evaluation?.rawResponse || 'No raw response stored for this evaluation.';

  const handleCopy = (text: string, section: 'prompt' | 'response') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Debug: Raw LLM Input / Output</h2>
              <p className="text-xs text-slate-400">Candidate: {candidate.name} ({candidate.email})</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 font-mono text-xs">
          {/* Raw Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                Raw LLM Prompt (System Guardrails + Candidate Data)
              </span>
              <button
                onClick={() => handleCopy(rawPrompt, 'prompt')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                {copiedSection === 'prompt' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {rawPrompt}
            </pre>
          </div>

          {/* Raw Response */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                Raw LLM Model Output (Unparsed JSON Payload)
              </span>
              <button
                onClick={() => handleCopy(rawResponse, 'response')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
              >
                {copiedSection === 'response' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Response</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {rawResponse}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-slate-800 bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close Debug View
          </button>
        </div>
      </div>
    </div>
  );
};
