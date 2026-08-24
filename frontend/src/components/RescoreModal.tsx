import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Job, Candidate } from '../types';
import { api } from '../api/client';
import { ScoreBadge } from './ScoreBadge';
import { RecommendationBadge } from './RecommendationBadge';

interface RescoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  allJobs: Job[];
  currentJobId: string;
  onRescored: (updatedCandidate: Candidate) => void;
}

export const RescoreModal: React.FC<RescoreModalProps> = ({
  isOpen,
  onClose,
  candidate,
  allJobs,
  currentJobId,
  onRescored,
}) => {
  const eligibleJobs = allJobs.filter((j) => j.id !== currentJobId);
  const [selectedJobId, setSelectedJobId] = useState<string>(
    eligibleJobs.length > 0 ? eligibleJobs[0].id : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescoreResult, setRescoreResult] = useState<Candidate | null>(null);

  if (!isOpen) return null;

  const handleRescore = async () => {
    if (!selectedJobId) {
      setError('Please select a target job position.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await api.rescoreCandidate(candidate.id, selectedJobId);
      setRescoreResult(updated);
      onRescored(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to re-score candidate against target job.');
    } finally {
      setLoading(false);
    }
  };

  const targetJob = allJobs.find((j) => j.id === selectedJobId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Re-score Against Another Role</h2>
              <p className="text-xs text-slate-400">Candidate: {candidate.name}</p>
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
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Evaluation Snapshot */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Current Role Evaluation
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{candidate.name}</div>
              <div className="text-xs text-slate-400">{candidate.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <ScoreBadge score={candidate.evaluation?.matchScore} size="sm" />
              <RecommendationBadge recommendation={candidate.evaluation?.recommendation} />
            </div>
          </div>

          {!rescoreResult ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Select Target Job Position
                </label>
                {eligibleJobs.length > 0 ? (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500 text-sm"
                  >
                    {eligibleJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} (Requires {j.minYearsExperience}+ yrs exp)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm">
                    No other job positions found. Create another job first to test re-scoring.
                  </div>
                )}
              </div>

              {targetJob && (
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs space-y-2">
                  <div className="font-semibold text-purple-300">Target Role Requirements:</div>
                  <div className="flex flex-wrap gap-1">
                    {targetJob.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-800/50 text-[11px]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Min Experience: {targetJob.minYearsExperience} years
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Note: Re-scoring generates a new evaluation record for this role without mutating or overwriting the original evaluation for the initial job.
              </p>
            </div>
          ) : (
            /* Rescore Result View */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Re-score Complete! New Evaluation Generated</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Target Role:</div>
                    <div className="text-sm font-bold text-white">{targetJob?.title}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={rescoreResult.evaluation?.matchScore} size="md" />
                    <RecommendationBadge recommendation={rescoreResult.evaluation?.recommendation} />
                  </div>
                </div>

                <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 leading-relaxed">
                  {rescoreResult.evaluation?.summary}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-400 font-semibold">Matched Skills:</div>
                  <div className="flex flex-wrap gap-1">
                    {rescoreResult.evaluation?.matchedSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px]">
                        {s}
                      </span>
                    ))}
                    {(!rescoreResult.evaluation?.matchedSkills || rescoreResult.evaluation?.matchedSkills.length === 0) && (
                      <span className="text-slate-500 italic">None matched</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-800 bg-slate-900">
          {!rescoreResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescore}
                disabled={loading || eligibleJobs.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-md shadow-purple-600/20"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Evaluating Against Target Role...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Re-evaluate Resume</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
