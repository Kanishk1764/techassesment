export type Recommendation = 'strong' | 'maybe' | 'no';
export type EvaluationStatus = 'complete' | 'error' | 'pending';
export type CandidateStatus = 'new' | 'shortlisted' | 'rejected';

export interface Evaluation {
  id: string;
  candidateId: string;
  jobId?: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  recommendation: Recommendation;
  status: EvaluationStatus;
  errorMessage?: string | null;
  rawPrompt?: string | null;
  rawResponse?: string | null;
  createdAt: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  yearsExperience?: number | null;
  status: CandidateStatus;
  createdAt: string;
  evaluation?: Evaluation | null;
  evaluations?: Evaluation[];
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  minYearsExperience: number;
  skillsWeight?: number;
  experienceWeight?: number;
  educationWeight?: number;
  createdAt: string;
  candidateCount?: number;
}

export interface BulkUploadResultItem {
  filename: string;
  status: 'success' | 'error';
  candidateId?: string;
  candidate?: Candidate;
  error?: string;
}

export interface BulkUploadResponse {
  batchId?: string;
  total: number;
  successful?: number;
  failed?: number;
  results?: BulkUploadResultItem[];
  status?: string;
  message?: string;
}

export interface BatchQueueStatusResponse {
  batchId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  total: number;
  processedCount: number;
  progress: number;
  currentFile?: string | null;
  results: BulkUploadResultItem[];
}

export interface CreateJobDto {
  title: string;
  description: string;
  requiredSkills: string[];
  minYearsExperience: number;
  skillsWeight?: number;
  experienceWeight?: number;
  educationWeight?: number;
}

export interface EnhanceJdResponse {
  title: string;
  description: string;
  requiredSkills: string[];
  minYearsExperience: number;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  isCostOptimized: boolean;
}

export interface ModelSettingsResponse {
  activeModel: string;
  availableModels: ModelOption[];
}
