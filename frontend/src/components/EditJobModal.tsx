'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Briefcase, Plus, AlertCircle, Sparkles, Sliders, Upload, CheckCircle2, Wand2, Edit3 } from 'lucide-react';
import { Job, CreateJobDto } from '../types';
import { api } from '../api/client';

interface EditJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  onJobUpdated: (updatedJob: Job) => void;
}

export const EditJobModal: React.FC<EditJobModalProps> = ({
  isOpen,
  onClose,
  job,
  onJobUpdated,
}) => {
  const [title, setTitle] = useState(job.title);
  const [description, setDescription] = useState(job.description);
  const [skillsInput, setSkillsInput] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>(job.requiredSkills || []);
  const [minYearsExperience, setMinYearsExperience] = useState<number>(job.minYearsExperience || 0);

  const [skillsWeight, setSkillsWeight] = useState<number>(job.skillsWeight || 50);
  const [experienceWeight, setExperienceWeight] = useState<number>(job.experienceWeight || 35);
  const [educationWeight, setEducationWeight] = useState<number>(job.educationWeight || 15);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [enhanceNotice, setEnhanceNotice] = useState<string | null>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && job) {
      setTitle(job.title);
      setDescription(job.description);
      setSkillsList(job.requiredSkills || []);
      setMinYearsExperience(job.minYearsExperience || 0);
      setSkillsWeight(job.skillsWeight || 50);
      setExperienceWeight(job.experienceWeight || 35);
      setEducationWeight(job.educationWeight || 15);
      setError(null);
      setEnhanceNotice(null);
    }
  }, [isOpen, job]);

  if (!isOpen) return null;

  const totalWeight = skillsWeight + experienceWeight + educationWeight;
  const isWeightValid = totalWeight === 100;

  const handleAddSkill = () => {
    const trimmed = skillsInput.trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
      setSkillsInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleKeyDownSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleAutoNormalize = () => {
    if (totalWeight === 0) {
      setSkillsWeight(50);
      setExperienceWeight(35);
      setEducationWeight(15);
      return;
    }
    const factor = 100 / totalWeight;
    const newSkills = Math.round(skillsWeight * factor);
    const newExp = Math.round(experienceWeight * factor);
    const newEdu = 100 - newSkills - newExp;
    setSkillsWeight(newSkills);
    setExperienceWeight(newExp);
    setEducationWeight(Math.max(0, newEdu));
  };

  const applyPreset = (s: number, e: number, ed: number) => {
    setSkillsWeight(s);
    setExperienceWeight(e);
    setEducationWeight(ed);
  };

  const handleExtractSkillsOnly = async () => {
    if (!description.trim() && !title.trim()) {
      setError('Please provide a job title or description first to extract skills.');
      return;
    }

    try {
      setIsExtractingSkills(true);
      setError(null);
      const enhanced = await api.enhanceJobDescription(`${title}\n${description}`);
      if (enhanced.requiredSkills && enhanced.requiredSkills.length > 0) {
        setSkillsList(enhanced.requiredSkills);
        setEnhanceNotice(`✨ Auto-extracted ${enhanced.requiredSkills.length} skills with AI!`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract skills.');
    } finally {
      setIsExtractingSkills(false);
    }
  };

  const handleEnhanceJd = async (file?: File) => {
    try {
      setIsEnhancing(true);
      setError(null);
      setEnhanceNotice(null);

      const enhanced = await api.enhanceJobDescription(description, file);
      setTitle(enhanced.title);
      setDescription(enhanced.description);
      setSkillsList(enhanced.requiredSkills);
      setMinYearsExperience(enhanced.minYearsExperience);
      setEnhanceNotice('✨ Job description enhanced and formatted into clean Markdown with skills extracted!');
    } catch (err: any) {
      setError(err.message || 'Failed to enhance job description.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleJdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleEnhanceJd(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Job title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Job description is required.');
      return;
    }
    if (skillsList.length === 0) {
      setError('Please add at least one required skill.');
      return;
    }
    if (minYearsExperience < 0) {
      setError('Minimum experience cannot be negative.');
      return;
    }

    if (totalWeight !== 100) {
      setError(`Evaluation weights must total 100% (currently ${totalWeight}%).`);
      return;
    }

    try {
      setLoading(true);
      const updated = await api.updateJob(job.id, {
        title: title.trim(),
        description: description.trim(),
        requiredSkills: skillsList,
        minYearsExperience,
        skillsWeight,
        experienceWeight,
        educationWeight,
      });
      onJobUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update job position.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edit Job Position Specifications</h2>
              <p className="text-xs text-slate-400">Modify requirements, criteria weights, and job description</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {enhanceNotice && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{enhanceNotice}</span>
            </div>
          )}

          {/* AI JD Enhancer Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-950 border border-sky-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI Job Description Enhancer & Auto-Skill Extractor
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Upload a document or re-polish notes with AI anytime.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={jdFileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleJdFileUpload}
              />
              <button
                type="button"
                onClick={() => jdFileInputRef.current?.click()}
                disabled={isEnhancing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload JD File</span>
              </button>

              <button
                type="button"
                onClick={() => handleEnhanceJd()}
                disabled={isEnhancing || !description.trim()}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isEnhancing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Polishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Polish with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Job Title <span className="text-sky-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Job Description (Markdown Formatted) <span className="text-sky-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500">Supports full markdown</span>
            </div>
            <textarea
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 font-mono text-xs resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Minimum Years Experience <span className="text-sky-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="30"
                required
                value={minYearsExperience}
                onChange={(e) => setMinYearsExperience(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Required Skills <span className="text-sky-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleExtractSkillsOnly}
                  disabled={isExtractingSkills || (!description.trim() && !title.trim())}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isExtractingSkills ? 'Extracting...' : 'Extract with AI'}</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={handleKeyDownSkill}
                  placeholder="Type skill & press Enter..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Skills List Chips */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Required Skills to Screen ({skillsList.length}):</span>
              {skillsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSkillsList([])}
                  className="text-[11px] text-slate-500 hover:text-rose-400"
                >
                  clear skills
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 items-center">
              {skillsList.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 shadow-sm"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-sky-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Smooth Individual Weightage Sliders */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Screening Weightage Distribution</span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                    isWeightValid
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  Total: {totalWeight}% {isWeightValid ? '✓' : `(needs ${100 - totalWeight > 0 ? `+${100 - totalWeight}%` : `${100 - totalWeight}%`})`}
                </div>

                {!isWeightValid && (
                  <button
                    type="button"
                    onClick={handleAutoNormalize}
                    className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Auto-Balance to 100%</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-500 mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset(50, 35, 15)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              >
                Standard (50/35/15)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(70, 20, 10)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              >
                Skills-Heavy (70/20/10)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30, 60, 10)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              >
                Experience-Heavy (30/60/10)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(40, 40, 20)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              >
                Balanced (40/40/20)
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                    <span className="text-slate-200 font-bold">Technical Skills Match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={skillsWeight}
                      onChange={(e) => setSkillsWeight(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-bold text-center text-xs"
                    />
                    <span className="text-sky-400 font-bold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={skillsWeight}
                  onChange={(e) => setSkillsWeight(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
                    <span className="text-slate-200 font-bold">Experience Duration Fit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={experienceWeight}
                      onChange={(e) => setExperienceWeight(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-bold text-center text-xs"
                    />
                    <span className="text-indigo-400 font-bold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={experienceWeight}
                  onChange={(e) => setExperienceWeight(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                    <span className="text-slate-200 font-bold">Domain & Education Fit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={educationWeight}
                      onChange={(e) => setEducationWeight(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                      className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-400 font-bold text-center text-xs"
                    />
                    <span className="text-purple-400 font-bold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={educationWeight}
                  onChange={(e) => setEducationWeight(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
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
              disabled={loading || !isWeightValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Job...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
