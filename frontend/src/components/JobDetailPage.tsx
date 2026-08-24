'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Briefcase,
  Users,
  Upload,
  UploadCloud,
  Filter,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Edit3,
} from 'lucide-react';
import { Job, Candidate, CandidateStatus } from '../types';
import { api } from '../api/client';
import { CandidateCard } from './CandidateCard';
import { CandidateUploadModal } from './CandidateUploadModal';
import { BulkUploadModal } from './BulkUploadModal';
import { EditJobModal } from './EditJobModal';
import { EmptyState } from './EmptyState';

interface JobDetailPageProps {
  jobId: string;
  onBack: () => void;
}

export const JobDetailPage: React.FC<JobDetailPageProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<(Job & { llmProvider?: string }) | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJdExpanded, setIsJdExpanded] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchJobData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobData, jobsList] = await Promise.all([
        api.getJob(jobId),
        api.getJobs(),
      ]);
      setJob(jobData);
      setAllJobs(jobsList);
    } catch (err: any) {
      setError(err.message || 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const fetchCandidates = useCallback(async () => {
    try {
      setCandidatesLoading(true);
      const data = await api.getCandidates(jobId, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        min_score: minScoreFilter > 0 ? minScoreFilter : undefined,
      });
      setCandidates(data);
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setCandidatesLoading(false);
    }
  }, [jobId, statusFilter, minScoreFilter]);

  useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: newStatus } : c))
    );

    try {
      await api.updateCandidateStatus(candidateId, newStatus);
    } catch (err) {
      console.error('Failed to update status on server:', err);
      fetchCandidates();
    }
  };

  const handleRetryEvaluation = async (candidateId: string) => {
    try {
      const updated = await api.retryEvaluation(candidateId);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? updated : c))
      );
    } catch (err) {
      console.error('Retry evaluation failed:', err);
      fetchCandidates();
    }
  };

  const handleCandidateUpdated = (updated: Candidate) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleJobUpdated = (updatedJob: Job) => {
    setJob((prev) => (prev ? { ...prev, ...updatedJob } : updatedJob));
    fetchCandidates();
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const totalCount = candidates.length;
  const shortlistedCount = candidates.filter((c) => c.status === 'shortlisted').length;
  const strongMatchesCount = candidates.filter((c) => c.evaluation?.recommendation === 'strong').length;
  const avgScore =
    totalCount > 0
      ? Math.round(
          candidates.reduce((sum, c) => sum + (c.evaluation?.matchScore || 0), 0) /
            totalCount
        )
      : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-10 bg-slate-900 rounded-xl w-48 animate-pulse" />
        <div className="h-44 bg-slate-900 rounded-3xl animate-pulse" />
        <div className="h-20 bg-slate-900 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-8 rounded-3xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-rose-400" />
          <h2 className="text-xl font-bold text-white">Job Position Not Found</h2>
          <p className="text-sm text-rose-300/80">{error || 'Unable to retrieve job specifications.'}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
          >
            Back to All Positions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Jobs</span>
        </button>

        <button
          onClick={() => setIsEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span>Edit Job Details</span>
        </button>
      </div>

      {/* Job Specifications Hero Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800/60">
              <Briefcase className="w-3.5 h-3.5" />
              Active Screening Position
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {job.title}
            </h1>

            {/* Rich Formatted Markdown Description */}
            <div className="relative">
              <div
                className={`prose prose-invert prose-sky max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed font-normal overflow-hidden transition-all duration-300 ${
                  isJdExpanded ? 'max-h-none' : 'max-h-32'
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ node, ...props }) => <h2 className="text-base font-bold text-white mt-3 mb-1.5" {...props} />,
                    h2: ({ node, ...props }) => <h3 className="text-sm font-bold text-sky-400 mt-3 mb-1" {...props} />,
                    h3: ({ node, ...props }) => <h4 className="text-xs font-bold text-slate-200 mt-2 mb-1" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-2 text-slate-300" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 mb-2 text-slate-300" {...props} />,
                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                  }}
                >
                  {job.description}
                </ReactMarkdown>
              </div>

              {/* Expand / Collapse Toggle if description is long */}
              {job.description.length > 200 && (
                <div className={`${!isJdExpanded ? 'pt-2 bg-gradient-to-t from-slate-900 to-transparent' : 'pt-2'}`}>
                  <button
                    onClick={() => setIsJdExpanded(!isJdExpanded)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {isJdExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Read Full Job Description</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span>Bulk Intake (Queue)</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md shadow-sky-500/25 transition-all active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Resume</span>
            </button>
          </div>
        </div>

        {/* Required Skills & Criteria Chips & Weights */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              Required Skills:
            </span>
            {job.requiredSkills.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-950 text-sky-300 border border-sky-900/60"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Minimum Experience: <strong className="text-white">{job.minYearsExperience} years</strong></span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4 text-slate-400">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Weights: Skills <strong className="text-sky-300">{job.skillsWeight || 50}%</strong> / Exp <strong className="text-indigo-300">{job.experienceWeight || 35}%</strong> / Domain <strong className="text-purple-300">{job.educationWeight || 15}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Applicants</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>Strong Matches</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{strongMatchesCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-indigo-400">
            <span>Shortlisted</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 mt-1">{shortlistedCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Average Fit Score</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">
            {avgScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
          />
        </div>

        {/* Right: Status and Score Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Applicants</option>
              <option value="new">New (Unreviewed)</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <span className="text-xs text-slate-400 font-semibold">Min Score:</span>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
              className="w-16 px-2 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-sky-500 text-center"
            />
            {minScoreFilter > 0 && (
              <button
                onClick={() => setMinScoreFilter(0)}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline"
              >
                Reset
              </button>
            )}
          </div>

          <button
            onClick={fetchCandidates}
            title="Refresh candidate rankings"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${candidatesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Candidate Ranking List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>Ranked Candidates</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
              {filteredCandidates.length}
            </span>
          </h2>
          <span className="text-xs text-slate-400">
            Sorted automatically by calibrated AI match score descending
          </span>
        </div>

        {candidatesLoading && candidates.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-slate-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <EmptyState
            icon={Users}
            title={totalCount === 0 ? "No Candidates Screened Yet" : "No Candidates Match Your Filters"}
            description={
              totalCount === 0
                ? "Upload resumes (.pdf, .docx, .txt) without manual form entry to let the AI screener extract credentials, match skills, and calculate scores."
                : "Try adjusting the status dropdown or minimum score filter to view more applicants."
            }
            actionButton={
              totalCount === 0 ? (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20"
                >
                  <Upload className="w-4 h-4" />
                  Upload First Resume
                </button>
              ) : (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setMinScoreFilter(0);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Clear All Filters
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredCandidates.map((candidate, idx) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                rank={idx + 1}
                allJobs={allJobs}
                currentJobId={jobId}
                onStatusChange={handleStatusChange}
                onRetryEvaluation={handleRetryEvaluation}
                onCandidateUpdated={handleCandidateUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Single Resume Modal */}
      {isUploadOpen && (
        <CandidateUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          jobId={jobId}
          jobTitle={job.title}
          onSuccess={() => {
            fetchCandidates();
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {isBulkOpen && (
        <BulkUploadModal
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          jobId={jobId}
          jobTitle={job.title}
          onCompleted={() => {
            fetchCandidates();
          }}
        />
      )}

      {/* Edit Job Modal */}
      {isEditOpen && (
        <EditJobModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          job={job}
          onJobUpdated={handleJobUpdated}
        />
      )}
    </div>
  );
};
export default JobDetailPage;
