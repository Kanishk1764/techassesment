import {
  Job, Candidate, CreateJobDto, BulkUploadResponse, BatchQueueStatusResponse,
  CandidateStatus, EnhanceJdResponse, ModelSettingsResponse
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Jobs
  async getJobs(): Promise<Job[]> {
    const res = await fetch(`${API_BASE}/jobs`);
    return handleResponse<Job[]>(res);
  },

  async getJob(id: string): Promise<Job & { llmProvider?: string }> {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    return handleResponse<Job & { llmProvider?: string }>(res);
  },

  async createJob(data: CreateJobDto): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Job>(res);
  },

  async updateJob(id: string, data: Partial<CreateJobDto>): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Job>(res);
  },

  async enhanceJobDescription(rawText?: string, file?: File): Promise<EnhanceJdResponse> {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (rawText) formData.append('rawText', rawText);
      const res = await fetch(`${API_BASE}/jobs/enhance`, {
        method: 'POST',
        body: formData,
      });
      return handleResponse<EnhanceJdResponse>(res);
    } else {
      const res = await fetch(`${API_BASE}/jobs/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawText || '' }),
      });
      return handleResponse<EnhanceJdResponse>(res);
    }
  },

  // Candidates
  async getCandidates(
    jobId: string,
    params?: { status?: string; min_score?: number }
  ): Promise<Candidate[]> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.min_score !== undefined && params.min_score > 0) {
      searchParams.set('min_score', params.min_score.toString());
    }

    const qs = searchParams.toString();
    const url = `${API_BASE}/jobs/${jobId}/candidates${qs ? `?${qs}` : ''}`;
    const res = await fetch(url);
    return handleResponse<Candidate[]>(res);
  },

  async uploadCandidate(jobId: string, formData: FormData): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/candidates`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Candidate>(res);
  },

  async bulkUploadCandidates(jobId: string, files: File[]): Promise<BulkUploadResponse> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('resumes', file);
    }
    const res = await fetch(`${API_BASE}/jobs/${jobId}/candidates/bulk`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<BulkUploadResponse>(res);
  },

  async getBulkUploadStatus(jobId: string, batchId: string): Promise<BatchQueueStatusResponse> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/candidates/bulk/${batchId}`);
    return handleResponse<BatchQueueStatusResponse>(res);
  },

  async updateCandidateStatus(candidateId: string, status: CandidateStatus): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse<Candidate>(res);
  },

  async rescoreCandidate(candidateId: string, targetJobId: string): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/rescore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetJobId }),
    });
    return handleResponse<Candidate>(res);
  },

  async retryEvaluation(candidateId: string): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/retry-evaluation`, {
      method: 'POST',
    });
    return handleResponse<Candidate>(res);
  },

  async streamSummary(
    jobId: string,
    candidateId: string,
    onChunk: (text: string) => void,
    onComplete: () => void,
    onError: (err: string) => void
  ): Promise<() => void> {
    const controller = new AbortController();

    fetch(`${API_BASE}/jobs/${jobId}/candidates/${candidateId}/stream-summary`, {
      method: 'POST',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Streaming failed');
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No readable stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  onChunk(data.token);
                }
                if (data.done) {
                  onComplete();
                  return;
                }
                if (data.error) {
                  onError(data.error);
                  return;
                }
              } catch {
                // ignore
              }
            }
          }
        }
        onComplete();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err.message);
        }
      });

    return () => controller.abort();
  },

  // Model Selection
  async getAvailableModels(): Promise<ModelSettingsResponse> {
    const res = await fetch(`${API_BASE}/models`);
    return handleResponse<ModelSettingsResponse>(res);
  },

  async setActiveModel(model: string): Promise<ModelSettingsResponse> {
    const res = await fetch(`${API_BASE}/settings/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    return handleResponse<ModelSettingsResponse>(res);
  },

  async getHealth(): Promise<{ status: string; llmProvider: string; activeModel?: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<{ status: string; llmProvider: string; activeModel?: string }>(res);
  },
};
