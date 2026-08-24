'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, Sparkles, Plus, Cpu, Layers, ChevronDown, Check, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import { ModelOption } from '../types';
import { SessionModal, RecruiterSession } from './SessionModal';

interface NavbarProps {
  onOpenCreateJob: () => void;
  onNavigateHome: () => void;
  selectedJobTitle?: string;
  activeModelName?: string;
  onModelChanged?: (newModel: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCreateJob,
  onNavigateHome,
  selectedJobTitle,
  activeModelName = 'gpt-4o-mini',
  onModelChanged,
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [currentModel, setCurrentModel] = useState<string>(activeModelName);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);

  // Recruiter Session state persisted in localStorage
  const [session, setSession] = useState<RecruiterSession>({
    recruiterName: 'Talent Lead',
    role: 'Senior Technical Recruiter',
    sessionId: 'sess_init',
    startedAt: new Date().toISOString(),
    screenedCount: 0,
  });

  useEffect(() => {
    // Load session from localStorage
    const saved = localStorage.getItem('talentscan_recruiter_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch {
        // ignore
      }
    } else {
      const initial: RecruiterSession = {
        recruiterName: 'Lead Recruiter',
        role: 'Talent Acquisition',
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 9),
        startedAt: new Date().toISOString(),
        screenedCount: 0,
      };
      setSession(initial);
      localStorage.setItem('talentscan_recruiter_session', JSON.stringify(initial));
    }

    api.getAvailableModels()
      .then((data) => {
        if (data?.availableModels) {
          setModels(data.availableModels);
          setCurrentModel(data.activeModel);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch available models:', err);
      });
  }, []);

  const handleUpdateSession = (newSession: RecruiterSession) => {
    setSession(newSession);
    localStorage.setItem('talentscan_recruiter_session', JSON.stringify(newSession));
  };

  const handleSelectModel = async (modelId: string) => {
    try {
      const res = await api.setActiveModel(modelId);
      setCurrentModel(res.activeModel);
      setIsDropdownOpen(false);
      if (onModelChanged) {
        onModelChanged(res.activeModel);
      }
    } catch (err) {
      console.error('Failed to change model:', err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-3 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black tracking-tight text-white flex items-center gap-1.5 text-base">
                  TalentScan <span className="text-sky-400 font-medium text-xs px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800/60">AI</span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Smart Resume Screening</div>
              </div>
            </button>

            {selectedJobTitle && (
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 border-l border-slate-800 pl-6">
                <button
                  onClick={onNavigateHome}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4" />
                  Jobs
                </button>
                <span className="text-slate-600">/</span>
                <span className="text-slate-200 font-semibold truncate max-w-xs">{selectedJobTitle}</span>
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Session Management Pill */}
            <button
              onClick={() => setIsSessionOpen(true)}
              title="Manage Active Recruiter Session"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-purple-900/50 text-purple-300 text-xs font-semibold transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate max-w-[120px]">{session.recruiterName}</span>
            </button>

            {/* Dynamic Model Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all bg-slate-900/90 text-sky-300 border-sky-800/50 hover:bg-slate-850"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Model: <strong className="text-white">{currentModel}</strong></span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1.5">
                    Select OpenAI Model
                  </div>
                  <div className="space-y-1">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectModel(m.id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start justify-between gap-2 ${
                          currentModel === m.id
                            ? 'bg-sky-950/80 text-white border border-sky-800/60'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {m.isCostOptimized && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                Cost-Efficient
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {m.description}
                          </div>
                        </div>
                        {currentModel === m.id && (
                          <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onNavigateHome}
              className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-850 border border-slate-800 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-slate-400" />
              All Jobs
            </button>

            <button
              onClick={onOpenCreateJob}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md shadow-sky-500/20 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Job</span>
            </button>
          </div>
        </div>
      </header>

      <SessionModal
        isOpen={isSessionOpen}
        onClose={() => setIsSessionOpen(false)}
        session={session}
        onUpdateSession={handleUpdateSession}
      />
    </>
  );
};
