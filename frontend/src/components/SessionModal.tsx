'use client';

import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Clock, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

export interface RecruiterSession {
  recruiterName: string;
  role: string;
  sessionId: string;
  startedAt: string;
  screenedCount: number;
}

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RecruiterSession;
  onUpdateSession: (newSession: RecruiterSession) => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  session,
  onUpdateSession,
}) => {
  const [name, setName] = useState(session.recruiterName);
  const [role, setRole] = useState(session.role);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setName(session.recruiterName);
    setRole(session.role);
  }, [session]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...session,
      recruiterName: name.trim() || 'Recruiter',
      role: role.trim() || 'Hiring Manager',
    };
    onUpdateSession(updated);
    setNotice('Session profile updated successfully!');
    setTimeout(() => {
      setNotice(null);
      onClose();
    }, 800);
  };

  const handleResetSession = () => {
    const newSession: RecruiterSession = {
      recruiterName: name.trim() || 'Recruiter',
      role: role.trim() || 'Hiring Manager',
      sessionId: 'session_' + Math.random().toString(36).substring(2, 9),
      startedAt: new Date().toISOString(),
      screenedCount: 0,
    };
    onUpdateSession(newSession);
    setNotice('Session refreshed and metrics reset!');
    setTimeout(() => {
      setNotice(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Recruiter Session & Identity</h2>
              <p className="text-[11px] text-slate-400">Manage active screening workspace session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {notice && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Session Overview Card */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Session ID:</span>
              <code className="text-sky-400 font-mono">{session.sessionId}</code>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Started At:</span>
              <span className="text-slate-200">{new Date(session.startedAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Screened in this session:</span>
              <span className="text-emerald-400 font-bold">{session.screenedCount} candidates</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Recruiter Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Role / Department
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetSession}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Session</span>
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md shadow-purple-600/20"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
