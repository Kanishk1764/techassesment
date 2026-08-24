from typing import List, Optional, Literal, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

RecommendationType = Literal["strong", "maybe", "no"]
EvaluationStatusType = Literal["complete", "error", "pending"]
CandidateStatusType = Literal["new", "shortlisted", "rejected"]

# Job Schemas
class CreateJobRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    requiredSkills: List[str] = Field(..., min_length=1)
    minYearsExperience: int = Field(..., ge=0)
    skillsWeight: Optional[int] = Field(default=50, ge=0, le=100)
    experienceWeight: Optional[int] = Field(default=35, ge=0, le=100)
    educationWeight: Optional[int] = Field(default=15, ge=0, le=100)

class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requiredSkills: Optional[List[str]] = None
    minYearsExperience: Optional[int] = None
    skillsWeight: Optional[int] = None
    experienceWeight: Optional[int] = None
    educationWeight: Optional[int] = None

class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    requiredSkills: List[str]
    minYearsExperience: int
    skillsWeight: int = 50
    experienceWeight: int = 35
    educationWeight: int = 15
    createdAt: datetime
    candidateCount: Optional[int] = 0
    llmProvider: Optional[str] = None

# Evaluation Schemas
class EvaluationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    candidateId: str
    jobId: Optional[str] = None
    matchScore: int
    matchedSkills: List[str]
    missingSkills: List[str]
    summary: str
    recommendation: RecommendationType
    status: EvaluationStatusType
    errorMessage: Optional[str] = None
    rawPrompt: Optional[str] = None
    rawResponse: Optional[str] = None
    createdAt: datetime

# Candidate Schemas
class CandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    jobId: str
    name: str
    email: str
    yearsExperience: Optional[float] = None
    status: CandidateStatusType
    createdAt: datetime
    evaluation: Optional[EvaluationResponse] = None
    evaluations: Optional[List[EvaluationResponse]] = []

class CandidateStatusUpdate(BaseModel):
    status: CandidateStatusType

class RescoreRequest(BaseModel):
    targetJobId: str

# Bulk Upload Schemas
class BulkUploadResultItem(BaseModel):
    filename: str
    status: Literal["success", "error"]
    candidateId: Optional[str] = None
    candidate: Optional[CandidateResponse] = None
    error: Optional[str] = None

class BulkUploadResponse(BaseModel):
    total: int
    successful: int
    failed: int
    results: List[BulkUploadResultItem]

class BatchQueueStatusResponse(BaseModel):
    batchId: str
    jobId: str
    status: Literal["queued", "processing", "completed", "failed"]
    total: int
    processedCount: int
    progress: int  # 0 to 100
    currentFile: Optional[str] = None
    results: List[BulkUploadResultItem] = []

# Enhance JD Schemas
class EnhanceJdRequest(BaseModel):
    rawText: Optional[str] = None

class EnhanceJdResponse(BaseModel):
    title: str
    description: str  # clean markdown
    requiredSkills: List[str]
    minYearsExperience: int

# Model Selection Schemas
class ModelOption(BaseModel):
    id: str
    name: str
    description: str
    isCostOptimized: bool = False

class ModelSettingsRequest(BaseModel):
    model: str

class ModelSettingsResponse(BaseModel):
    activeModel: str
    availableModels: List[ModelOption]

# Error Shape
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ApiErrorResponse(BaseModel):
    error: ErrorDetail
