from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Candidate, Job, Evaluation
from ..schemas import CandidateResponse, CandidateStatusUpdate, RescoreRequest
from ..services.evaluation import run_candidate_evaluation, format_candidate

router = APIRouter(prefix="/candidates", tags=["Candidates"])

@router.patch("/{id}", response_model=CandidateResponse)
async def update_candidate_status(
    id: str,
    payload: CandidateStatusUpdate,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail={"error": {"code": "CANDIDATE_NOT_FOUND", "message": f'Candidate with ID "{id}" was not found.'}})

    candidate.status = payload.status
    db.commit()
    db.refresh(candidate)

    return format_candidate(candidate, candidate.job_id)

@router.post("/{id}/rescore", response_model=CandidateResponse)
async def rescore_candidate(
    id: str,
    payload: RescoreRequest,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail={"error": {"code": "CANDIDATE_NOT_FOUND", "message": f'Candidate with ID "{id}" was not found.'}})

    target_job = db.query(Job).filter(Job.id == payload.targetJobId).first()
    if not target_job:
        raise HTTPException(status_code=404, detail={"error": {"code": "TARGET_JOB_NOT_FOUND", "message": f'Target job with ID "{payload.targetJobId}" was not found.'}})

    # Run evaluation against target job requirements without mutating original job evaluation
    await run_candidate_evaluation(db, candidate.id, payload.targetJobId)
    db.refresh(candidate)

    return format_candidate(candidate, payload.targetJobId)

@router.post("/{id}/retry-evaluation", response_model=CandidateResponse)
async def retry_evaluation(
    id: str,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail={"error": {"code": "CANDIDATE_NOT_FOUND", "message": f'Candidate with ID "{id}" was not found.'}})

    await run_candidate_evaluation(db, candidate.id, candidate.job_id)
    db.refresh(candidate)

    return format_candidate(candidate, candidate.job_id)

@router.get("/{id}", response_model=CandidateResponse)
async def get_candidate(
    id: str,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail={"error": {"code": "CANDIDATE_NOT_FOUND", "message": f'Candidate with ID "{id}" was not found.'}})

    return format_candidate(candidate, candidate.job_id)
