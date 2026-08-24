'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, Users, Plus, Sparkles, Clock, ArrowRight, Layers } from 'lucide-react';
import { Job } from '../types';
import { api } from '../api/client';
import { EmptyState } from './EmptyState';

interface JobListPageProps {
  onSelectJob: (jobId: string) => void;
  onOpenCreateJob: () => void;
}

export const JobListPage: React.FC<JobListPageProps> = ({
  onSelectJob,
  onOpenCreateJob,
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/60 border border-slate-800 p-8 md:p-10 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Talent Acquisition & Resume Screening
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Screen candidates <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">10x faster</span> with verifiable AI evaluation.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Upload resumes, extract skills automatically, rank applicants with transparent criteria, and re-screen across open positions seamlessly.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCreateJob}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25 transition-all"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>Create New Position</span>
            </button>
          </div>
        </div>

        {/* Decorative ambient blur */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-sky-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Positions Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Active Job Openings
          </h2>
          <p className="text-xs text-slate-400">Select a job position to view ranked candidates or upload resumes</p>
        </div>
        <div className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          {jobs.length} Positions Available
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-800 rounded-lg w-3/4" />
              <div className="h-4 bg-slate-800/60 rounded-md w-full" />
              <div className="h-4 bg-slate-800/60 rounded-md w-2/3" />
              <div className="h-10 bg-slate-800/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Job Positions Created Yet"
          description="Get started by creating your first job position to define skills, minimum experience, and start evaluating resumes."
          actionButton={
            <button
              onClick={onOpenCreateJob}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              Create First Job
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className="group cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900 transition-all duration-200 p-6 flex flex-col justify-between space-y-6 shadow-md hover:shadow-xl hover:shadow-sky-950/30"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 text-slate-300 text-xs font-semibold border border-slate-800 shrink-0">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{job.candidateCount || 0}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Target Skills ({job.requiredSkills.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.requiredSkills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.requiredSkills.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-950 text-slate-500 border border-slate-800">
                        +{job.requiredSkills.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Min {job.minYearsExperience} yrs exp
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                  Screen Candidates <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default JobListPage;
