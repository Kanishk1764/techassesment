'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  X,
  RotateCcw,
  RefreshCw,
  Terminal,
  Clock,
  Briefcase,
  AlertTriangle,
  Sparkles,
  UserCheck,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { Candidate, CandidateStatus, Job } from '../types';
import { ScoreBadge } from './ScoreBadge';
import { RecommendationBadge } from './RecommendationBadge';
import { RescoreModal } from './RescoreModal';
import { RawLlmDebugModal } from './RawLlmDebugModal';
import { api } from '../api/client';

interface CandidateCardProps {
  candidate: Candidate;
  rank: number;
  allJobs: Job[];
  currentJobId: string;
  onStatusChange: (candidateId: string, newStatus: CandidateStatus) => Promise<void>;
  onRetryEvaluation: (candidateId: string) => Promise<void>;
  onCandidateUpdated: (candidate: Candidate) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  rank,
  allJobs,
  currentJobId,
  onStatusChange,
  onRetryEvaluation,
  onCandidateUpdated,
}) => {
  const [isRescoreOpen, setIsRescoreOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Live SSE streaming summary state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState<string | null>(null);

  const evaluation = candidate.evaluation;
  const isEvaluationError = evaluation?.status === 'error';
  const matchScore = evaluation?.matchScore ?? 0;

  // Threshold tier classification
  const isFastTrackTier = matchScore >= 80;
  const isHumanReviewTier = matchScore >= 50 && matchScore < 80;
  const isLowMatchTier = matchScore < 50;

  const handleStatus = async (status: CandidateStatus) => {
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(candidate.id, status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      await onRetryEvaluation(candidate.id);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleLiveStreamSummary = async () => {
    try {
      setIsStreaming(true);
      setStreamedText('');
      await api.streamSummary(
        currentJobId,
        candidate.id,
        (chunk) => {
          setStreamedText((prev) => (prev || '') + chunk);
        },
        () => {
          setIsStreaming(false);
        },
        (err) => {
          console.error('Streaming error:', err);
          setIsStreaming(false);
        }
      );
    } catch (err) {
      console.error('Failed to initiate live stream:', err);
      setIsStreaming(false);
    }
  };

  return (
    <>
      <div
        className={`group relative rounded-2xl border transition-all duration-200 ${
          candidate.status === 'shortlisted'
            ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
            : candidate.status === 'rejected'
            ? 'bg-slate-900/60 border-rose-900/30 opacity-75'
            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-md'
        } p-6`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left Column: Rank + Candidate Info & Evaluation Details */}
          <div className="flex items-start gap-4 flex-1">
            {/* Rank badge */}
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
              #{rank}
            </div>

            <div className="space-y-3 flex-1 min-w-0">
              {/* Header: Name, Status, Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-extrabold text-white truncate max-w-sm">
                  {candidate.name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">({candidate.email})</span>

                {/* Candidate Status Tag */}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider ${
                    candidate.status === 'shortlisted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : candidate.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {candidate.status}
                </span>

                {/* Threshold Segregation Badge */}
                {!isEvaluationError && (
                  <>
                    {isFastTrackTier && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Fast-Track Shortlist (≥80%)</span>
                      </span>
                    )}
                    {isHumanReviewTier && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm">
                        <UserCheck className="w-3 h-3 text-amber-400" />
                        <span>Human Review Lead (50-79%)</span>
                      </span>
                    )}
                    {isLowMatchTier && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm">
                        <X className="w-3 h-3 text-rose-400" />
                        <span>Low Match (&lt;50%)</span>
                      </span>
                    )}
                  </>
                )}

                <RecommendationBadge
                  recommendation={evaluation?.recommendation}
                  status={evaluation?.status}
                />
              </div>

              {/* Years Experience & Upload Date */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {candidate.yearsExperience !== null && candidate.yearsExperience !== undefined && (
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    {candidate.yearsExperience.toFixed(1)} yrs verified experience
                  </span>
                )}
                <span className="text-slate-500">
                  Applied {new Date(candidate.createdAt).toLocaleDateString()}
                </span>
                {candidate.evaluations && candidate.evaluations.length > 1 && (
                  <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 text-[10px] font-semibold">
                    {candidate.evaluations.length} Evaluations
                  </span>
                )}

                {/* Stream AI Summary CTA button */}
                <button
                  onClick={handleLiveStreamSummary}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold transition-colors disabled:opacity-50 ml-auto"
                >
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>{isStreaming ? 'Streaming AI...' : 'Live Stream Summary'}</span>
                </button>
              </div>

              {/* Human Review Callout Box if in 50-79% tier */}
              {isHumanReviewTier && !isEvaluationError && candidate.status === 'new' && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-medium">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>AI Recommendation:</strong> Borderline candidate. Review skills and experience justification below to make the final Shortlist / Reject call.
                  </span>
                </div>
              )}

              {/* AI Summary or Error Message */}
              {isEvaluationError ? (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">AI Screening Error</div>
                      <div className="text-[11px] text-rose-300/80 mt-0.5">
                        {evaluation?.errorMessage || 'Evaluation failed. Please click retry to re-evaluate.'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>Retry</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 space-y-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                    }}
                  >
                    {streamedText !== null ? streamedText : (evaluation?.summary || 'No evaluation summary available.')}
                  </ReactMarkdown>

                  {isStreaming && (
                    <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-mono pt-1">
                      <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      <span>Generating live AI evaluation summary...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Analysis */}
              {!isEvaluationError && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Matched Skills */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Matched Skills ({evaluation?.matchedSkills.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {evaluation?.matchedSkills && evaluation.matchedSkills.length > 0 ? (
                        evaluation.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">None matched</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      Missing Skills ({evaluation?.missingSkills.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {evaluation?.missingSkills && evaluation.missingSkills.length > 0 ? (
                        evaluation.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-950 text-slate-400 border border-slate-800"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-emerald-400/80 italic font-medium">
                          All required skills matched!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Match Score + Action Toolbar */}
          <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            {/* Score Badge */}
            <div className="flex items-center gap-3">
              <ScoreBadge
                score={evaluation?.matchScore}
                status={evaluation?.status}
                size="lg"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleStatus('shortlisted')}
                disabled={isUpdatingStatus || candidate.status === 'shortlisted'}
                title="Shortlist Candidate"
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  candidate.status === 'shortlisted'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border border-slate-700 hover:border-emerald-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Shortlist</span>
              </button>

              <button
                onClick={() => handleStatus('rejected')}
                disabled={isUpdatingStatus || candidate.status === 'rejected'}
                title="Reject Candidate"
                className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  candidate.status === 'rejected'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-700'
                }`}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Reject</span>
              </button>

              {candidate.status !== 'new' && (
                <button
                  onClick={() => handleStatus('new')}
                  disabled={isUpdatingStatus}
                  title="Reset to Review Needed"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Stretch Actions: Re-score against another role + Raw LLM Debug Modal */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRescoreOpen(true)}
                title="Re-score against another job position"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/50 flex items-center gap-1.5 transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Re-score...</span>
              </button>

              <button
                onClick={() => setIsDebugOpen(true)}
                title="View raw LLM prompt and response"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Re-score Modal */}
      {isRescoreOpen && (
        <RescoreModal
          isOpen={isRescoreOpen}
          onClose={() => setIsRescoreOpen(false)}
          candidate={candidate}
          allJobs={allJobs}
          currentJobId={currentJobId}
          onRescored={(updated) => {
            onCandidateUpdated(updated);
          }}
        />
      )}

      {/* Debug Raw LLM I/O Modal */}
      {isDebugOpen && (
        <RawLlmDebugModal
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
          candidate={candidate}
        />
      )}
    </>
  );
};
