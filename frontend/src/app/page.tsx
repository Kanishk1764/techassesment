'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { CreateJobModal } from '../components/CreateJobModal';
import { JobListPage } from '../components/JobListPage';
import { JobDetailPage } from '../components/JobDetailPage';
import { api } from '../api/client';
import { CreateJobDto } from '../types';

export default function Home() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string | undefined>();
  const [activeModelName, setActiveModelName] = useState<string>('gpt-4o-mini');

  useEffect(() => {
    api.getAvailableModels()
      .then((data) => {
        if (data?.activeModel) {
          setActiveModelName(data.activeModel);
        }
      })
      .catch((err) => {
        console.warn('Backend connection notice:', err);
      });
  }, []);

  const handleSelectJob = async (jobId: string) => {
    setSelectedJobId(jobId);
    try {
      const job = await api.getJob(jobId);
      setSelectedJobTitle(job.title);
    } catch {
      setSelectedJobTitle(undefined);
    }
  };

  const handleNavigateHome = () => {
    setSelectedJobId(null);
    setSelectedJobTitle(undefined);
  };

  const handleCreateJob = async (jobData: CreateJobDto) => {
    const created = await api.createJob(jobData);
    handleSelectJob(created.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        onOpenCreateJob={() => setIsCreateJobOpen(true)}
        onNavigateHome={handleNavigateHome}
        selectedJobTitle={selectedJobTitle}
        activeModelName={activeModelName}
        onModelChanged={(m) => setActiveModelName(m)}
      />

      <main className="flex-1">
        {selectedJobId ? (
          <JobDetailPage
            jobId={selectedJobId}
            onBack={handleNavigateHome}
          />
        ) : (
          <JobListPage
            onSelectJob={handleSelectJob}
            onOpenCreateJob={() => setIsCreateJobOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            TalentScan AI — Full-Stack Resume Screening & Evaluation Platform
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI (Python)</span>
            <span>•</span>
            <span>Next.js 14+</span>
            <span>•</span>
            <span>OpenAI Multi-Modal</span>
          </div>
        </div>
      </footer>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={isCreateJobOpen}
        onClose={() => setIsCreateJobOpen(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  );
}
