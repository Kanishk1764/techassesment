import json
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from ..models import Candidate, Job, Evaluation
from .llm import get_llm_provider

logger = logging.getLogger(__name__)

def parse_json_list(val: Optional[str]) -> List[str]:
    if not val:
        return []
    try:
        data = json.loads(val)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def format_evaluation(evaluation: Optional[Evaluation]) -> Optional[Dict[str, Any]]:
    if not evaluation:
        return None
    return {
        "id": evaluation.id,
        "candidateId": evaluation.candidate_id,
        "jobId": evaluation.job_id,
        "matchScore": evaluation.match_score,
        "matchedSkills": parse_json_list(evaluation.matched_skills),
        "missingSkills": parse_json_list(evaluation.missing_skills),
        "summary": evaluation.summary,
        "recommendation": evaluation.recommendation,
        "status": evaluation.status,
        "errorMessage": evaluation.error_message,
        "rawPrompt": evaluation.raw_prompt,
        "rawResponse": evaluation.raw_response,
        "createdAt": evaluation.created_at,
    }

def format_candidate(candidate: Optional[Candidate], active_job_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not candidate:
        return None

    active_eval = None
    if candidate.evaluations:
        if active_job_id:
            for ev in candidate.evaluations:
                if ev.job_id == active_job_id:
                    active_eval = ev
                    break
            if not active_eval:
                active_eval = candidate.evaluations[0]
        else:
            active_eval = candidate.evaluations[0]

    return {
        "id": candidate.id,
        "jobId": candidate.job_id,
        "name": candidate.name,
        "email": candidate.email,
        "yearsExperience": candidate.years_experience,
        "status": candidate.status,
        "createdAt": candidate.created_at,
        "evaluation": format_evaluation(active_eval),
        "evaluations": [format_evaluation(ev) for ev in (candidate.evaluations or [])],
    }

async def run_candidate_evaluation(
    db: Session,
    candidate_id: str,
    job_id: str,
    page_images_base64: Optional[List[str]] = None
) -> Dict[str, Any]:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise ValueError(f"Candidate {candidate_id} not found")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError(f"Job {job_id} not found")

    required_skills = parse_json_list(job.required_skills)
    skills_weight = getattr(job, "skills_weight", 50) or 50
    experience_weight = getattr(job, "experience_weight", 35) or 35
    education_weight = getattr(job, "education_weight", 15) or 15

    llm_provider = get_llm_provider()

    try:
        eval_result = await llm_provider.evaluate_candidate(
            job_title=job.title,
            job_description=job.description,
            required_skills=required_skills,
            min_years_experience=job.min_years_experience,
            resume_text=candidate.resume_text,
            skills_weight=skills_weight,
            experience_weight=experience_weight,
            education_weight=education_weight,
            page_images_base64=page_images_base64
        )

        existing = db.query(Evaluation).filter(
            Evaluation.candidate_id == candidate_id,
            Evaluation.job_id == job_id
        ).first()

        if existing:
            existing.match_score = eval_result.match_score
            existing.matched_skills = json.dumps(eval_result.matched_skills)
            existing.missing_skills = json.dumps(eval_result.missing_skills)
            existing.summary = eval_result.summary
            existing.recommendation = eval_result.recommendation
            existing.status = "complete"
            existing.error_message = None
            existing.raw_prompt = eval_result.raw_prompt
            existing.raw_response = eval_result.raw_response
            saved = existing
        else:
            saved = Evaluation(
                candidate_id=candidate_id,
                job_id=job_id,
                match_score=eval_result.match_score,
                matched_skills=json.dumps(eval_result.matched_skills),
                missing_skills=json.dumps(eval_result.missing_skills),
                summary=eval_result.summary,
                recommendation=eval_result.recommendation,
                status="complete",
                error_message=None,
                raw_prompt=eval_result.raw_prompt,
                raw_response=eval_result.raw_response,
            )
            db.add(saved)

        # Threshold Segregation & Auto-Categorization:
        # - >= 80%: Auto-shortlist candidates meeting high criteria threshold
        # - < 50%: Auto-reject low match candidates
        # - 50% - 79%: Candidate remains "new" for Human Reviewer Decision
        if candidate.status == "new":
            if eval_result.match_score >= 80:
                candidate.status = "shortlisted"
            elif eval_result.match_score < 50:
                candidate.status = "rejected"
            else:
                candidate.status = "new"  # Review required by human recruiter

        db.commit()
        db.refresh(saved)
        db.refresh(candidate)

        return format_evaluation(saved)

    except Exception as e:
        logger.error(f"Evaluation failed for candidate {candidate_id}: {e}")
        existing = db.query(Evaluation).filter(
            Evaluation.candidate_id == candidate_id,
            Evaluation.job_id == job_id
        ).first()

        if existing:
            existing.match_score = 0
            existing.matched_skills = json.dumps([])
            existing.missing_skills = json.dumps(required_skills)
            existing.summary = "AI evaluation failed, please retry"
            existing.recommendation = "no"
            existing.status = "error"
            existing.error_message = str(e)
            saved = existing
        else:
            saved = Evaluation(
                candidate_id=candidate_id,
                job_id=job_id,
                match_score=0,
                matched_skills=json.dumps([]),
                missing_skills=json.dumps(required_skills),
                summary="AI evaluation failed, please retry",
                recommendation="no",
                status="error",
                error_message=str(e),
            )
            db.add(saved)

        db.commit()
        db.refresh(saved)

        return format_evaluation(saved)
