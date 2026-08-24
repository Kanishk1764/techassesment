import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Job, Candidate, Evaluation
from ..schemas import (
    CreateJobRequest, UpdateJobRequest, JobResponse, CandidateResponse,
    BulkUploadResponse, BulkUploadResultItem, BatchQueueStatusResponse,
    EnhanceJdRequest, EnhanceJdResponse
)
from ..services.parser import parse_resume_bytes
from ..services.evaluation import run_candidate_evaluation, format_candidate, parse_json_list
from ..services.llm import get_llm_provider, get_active_provider_name
from ..services.queue import queue_manager, BatchJobItem
from ..config import settings

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/enhance", response_model=EnhanceJdResponse)
async def enhance_job_description_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    rawText: Optional[str] = Form(None)
):
    content_type = request.headers.get("content-type", "")
    raw_input = ""

    if "application/json" in content_type:
        try:
            body = await request.json()
            raw_input = (body.get("rawText") or "").strip()
        except Exception:
            raw_input = ""
    elif file:
        file_bytes = await file.read()
        parsed = parse_resume_bytes(file_bytes, file.filename or "jd.pdf", render_images=False)
        raw_input = parsed.text
    elif rawText:
        raw_input = rawText.strip()

    if not raw_input:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "EMPTY_JD_INPUT", "message": "Please provide job description text or upload a document."}}
        )

    llm = get_llm_provider()
    enhanced = await llm.enhance_job_description(raw_input)
    return EnhanceJdResponse(
        title=enhanced["title"],
        description=enhanced["description"],
        requiredSkills=enhanced["required_skills"],
        minYearsExperience=enhanced["min_years_experience"]
    )

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(payload: CreateJobRequest, db: Session = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_TITLE", "message": "Job title is required and cannot be empty."}})
    if not payload.description.strip():
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_DESCRIPTION", "message": "Job description is required and cannot be empty."}})
    if not payload.requiredSkills or not all(isinstance(s, str) and s.strip() for s in payload.requiredSkills):
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_REQUIRED_SKILLS", "message": "requiredSkills must be a non-empty array of strings."}})
    if payload.minYearsExperience < 0:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_MIN_EXPERIENCE", "message": "minYearsExperience must be non-negative."}})

    # Validate weights sum to 100
    w_skills = payload.skillsWeight if payload.skillsWeight is not None else 50
    w_exp = payload.experienceWeight if payload.experienceWeight is not None else 35
    w_edu = payload.educationWeight if payload.educationWeight is not None else 15
    if (w_skills + w_exp + w_edu) != 100:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_WEIGHT_SUM", "message": f"Weightage sum must equal exactly 100% (currently {w_skills + w_exp + w_edu}%)."}}
        )

    cleaned_skills = [s.strip() for s in payload.requiredSkills]
    job = Job(
        title=payload.title.strip(),
        description=payload.description.strip(),
        required_skills=json.dumps(cleaned_skills),
        min_years_experience=payload.minYearsExperience,
        skills_weight=w_skills,
        experience_weight=w_exp,
        education_weight=w_edu,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        requiredSkills=cleaned_skills,
        minYearsExperience=job.min_years_experience,
        skillsWeight=job.skills_weight,
        experienceWeight=job.experience_weight,
        educationWeight=job.education_weight,
        createdAt=job.created_at,
        candidateCount=0,
        llmProvider=get_active_provider_name()
    )

@router.put("/{id}", response_model=JobResponse)
@router.patch("/{id}", response_model=JobResponse)
async def update_job(id: str, payload: UpdateJobRequest, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f'Job with ID "{id}" was not found.'}})

    if payload.title is not None:
        if not payload.title.strip():
            raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_TITLE", "message": "Job title cannot be empty."}})
        job.title = payload.title.strip()

    if payload.description is not None:
        if not payload.description.strip():
            raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_DESCRIPTION", "message": "Job description cannot be empty."}})
        job.description = payload.description.strip()

    if payload.requiredSkills is not None:
        if not payload.requiredSkills or not all(isinstance(s, str) and s.strip() for s in payload.requiredSkills):
            raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_REQUIRED_SKILLS", "message": "requiredSkills must be a non-empty array of strings."}})
        job.required_skills = json.dumps([s.strip() for s in payload.requiredSkills])

    if payload.minYearsExperience is not None:
        if payload.minYearsExperience < 0:
            raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_MIN_EXPERIENCE", "message": "minYearsExperience must be non-negative."}})
        job.min_years_experience = payload.minYearsExperience

    # Weightage updates
    w_skills = payload.skillsWeight if payload.skillsWeight is not None else job.skills_weight
    w_exp = payload.experienceWeight if payload.experienceWeight is not None else job.experience_weight
    w_edu = payload.educationWeight if payload.educationWeight is not None else job.education_weight

    if (w_skills + w_exp + w_edu) != 100:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_WEIGHT_SUM", "message": f"Weightage sum must equal exactly 100% (currently {w_skills + w_exp + w_edu}%)."}}
        )

    job.skills_weight = w_skills
    job.experience_weight = w_exp
    job.education_weight = w_edu

    db.commit()
    db.refresh(job)

    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        requiredSkills=parse_json_list(job.required_skills),
        minYearsExperience=job.min_years_experience,
        skillsWeight=job.skills_weight,
        experienceWeight=job.experience_weight,
        educationWeight=job.education_weight,
        createdAt=job.created_at,
        candidateCount=len(job.candidates),
        llmProvider=get_active_provider_name()
    )

@router.get("", response_model=List[JobResponse])
async def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    results = []
    for j in jobs:
        results.append(JobResponse(
            id=j.id,
            title=j.title,
            description=j.description,
            requiredSkills=parse_json_list(j.required_skills),
            minYearsExperience=j.min_years_experience,
            skillsWeight=getattr(j, "skills_weight", 50) or 50,
            experienceWeight=getattr(j, "experience_weight", 35) or 35,
            educationWeight=getattr(j, "education_weight", 15) or 15,
            createdAt=j.created_at,
            candidateCount=len(j.candidates),
            llmProvider=get_active_provider_name()
        ))
    return results

@router.get("/{id}", response_model=JobResponse)
async def get_job(id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f'Job with ID "{id}" was not found.'}})

    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        requiredSkills=parse_json_list(job.required_skills),
        minYearsExperience=job.min_years_experience,
        skillsWeight=getattr(job, "skills_weight", 50) or 50,
        experienceWeight=getattr(job, "experience_weight", 35) or 35,
        educationWeight=getattr(job, "education_weight", 15) or 15,
        createdAt=job.created_at,
        candidateCount=len(job.candidates),
        llmProvider=get_active_provider_name()
    )

@router.post("/{id}/candidates", response_model=CandidateResponse, status_code=status.HTTP_201_CREATED)
async def upload_candidate(
    id: str,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f'Job with ID "{id}" was not found.'}})

    file_bytes = await resume.read()
    filename = resume.filename or "resume.pdf"
    parsed = parse_resume_bytes(file_bytes, filename, render_images=True)

    # Zero-prompt extraction fallback: automatically use inferred name/email if not explicitly supplied
    candidate_name = (name.strip() if name and name.strip() else parsed.inferred_name) or "Candidate"
    candidate_email = (email.strip().lower() if email and email.strip() else parsed.inferred_email) or f"candidate_{filename[:8]}@applicant.local"

    candidate = Candidate(
        job_id=id,
        name=candidate_name,
        email=candidate_email,
        resume_text=parsed.text,
        years_experience=parsed.inferred_years_experience,
        status="new",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    # Synchronously run evaluation with multi-modal vision images if available
    await run_candidate_evaluation(db, candidate.id, id, page_images_base64=parsed.page_images_base64)
    db.refresh(candidate)

    return format_candidate(candidate, id)

@router.get("/{id}/candidates", response_model=List[CandidateResponse])
async def list_candidates(
    id: str,
    status: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f'Job with ID "{id}" was not found.'}})

    query = db.query(Candidate).filter(Candidate.job_id == id)

    if status:
        if status not in ["new", "shortlisted", "rejected"]:
            raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_STATUS_FILTER", "message": 'Status filter must be one of: "new", "shortlisted", "rejected".'}})
        query = query.filter(Candidate.status == status)

    if min_score is not None:
        if min_score < 0 or min_score > 100:
            raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_MIN_SCORE", "message": "min_score must be between 0 and 100."}})

    candidates = query.order_by(Candidate.created_at.desc()).all()
    formatted = [format_candidate(c, id) for c in candidates]

    # Filter by min_score
    if min_score is not None:
        formatted = [c for c in formatted if c.get("evaluation") and c["evaluation"]["matchScore"] >= min_score]

    # Rank by matchScore descending (evaluations with error sort last)
    def sort_key(c):
        ev = c.get("evaluation")
        if not ev or ev.get("status") == "error":
            return -1
        return ev.get("matchScore", 0)

    formatted.sort(key=sort_key, reverse=True)
    return formatted

# Bulk Upload & Queueing Endpoint
@router.post("/{id}/candidates/bulk")
async def bulk_upload_candidates(
    id: str,
    background_tasks: BackgroundTasks,
    resumes: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f'Job with ID "{id}" was not found.'}})

    if not resumes or len(resumes) == 0:
        raise HTTPException(status_code=400, detail={"error": {"code": "NO_FILES_PROVIDED", "message": "No resume files were uploaded."}})

    if len(resumes) > settings.max_bulk_files:
        raise HTTPException(status_code=400, detail={"error": {"code": "TOO_MANY_FILES", "message": f"Bulk upload is capped at {settings.max_bulk_files} files per batch."}})

    batch_items: List[BatchJobItem] = []
    for f in resumes:
        content = await f.read()
        batch_items.append(BatchJobItem(filename=f.filename or "resume.pdf", content_bytes=content))

    batch_task = queue_manager.create_batch(job_id=id, total=len(batch_items))
    background_tasks.add_task(queue_manager.process_batch_background, batch_task.batch_id, batch_items)

    return {
        "batchId": batch_task.batch_id,
        "jobId": id,
        "status": "queued",
        "total": len(batch_items),
        "message": f"Enqueued {len(batch_items)} resumes for background screening."
    }

@router.get("/{id}/candidates/bulk/{batch_id}", response_model=BatchQueueStatusResponse)
async def get_bulk_upload_status(id: str, batch_id: str):
    task = queue_manager.get_batch(batch_id)
    if not task:
        raise HTTPException(status_code=404, detail={"error": {"code": "BATCH_NOT_FOUND", "message": f"Batch task {batch_id} not found."}})

    return BatchQueueStatusResponse(
        batchId=task.batch_id,
        jobId=task.job_id,
        status=task.status,
        total=task.total,
        processedCount=task.processed_count,
        progress=task.progress,
        currentFile=task.current_file,
        results=[BulkUploadResultItem(**r) for r in task.results]
    )

@router.post("/{id}/candidates/{candidate_id}/stream-summary")
async def stream_summary(id: str, candidate_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f'Job with ID "{id}" was not found.'}})

    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail={"error": {"code": "CANDIDATE_NOT_FOUND", "message": f'Candidate with ID "{candidate_id}" was not found.'}})

    required_skills = parse_json_list(job.required_skills)
    skills_weight = getattr(job, "skills_weight", 50) or 50
    experience_weight = getattr(job, "experience_weight", 35) or 35
    education_weight = getattr(job, "education_weight", 15) or 15

    llm_provider = get_llm_provider()

    async def event_generator():
        try:
            async for token in llm_provider.stream_summary(
                job_title=job.title,
                job_description=job.description,
                required_skills=required_skills,
                min_years_experience=job.min_years_experience,
                resume_text=candidate.resume_text,
                skills_weight=skills_weight,
                experience_weight=experience_weight,
                education_weight=education_weight
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
