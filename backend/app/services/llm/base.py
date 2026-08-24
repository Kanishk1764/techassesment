from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator

class EvaluationResult:
    def __init__(
        self,
        match_score: int,
        matched_skills: List[str],
        missing_skills: List[str],
        summary: str,
        recommendation: str,
        raw_prompt: str,
        raw_response: str
    ):
        self.match_score = match_score
        self.matched_skills = matched_skills
        self.missing_skills = missing_skills
        self.summary = summary
        self.recommendation = recommendation
        self.raw_prompt = raw_prompt
        self.raw_response = raw_response

class LlmProvider(ABC):
    @abstractmethod
    async def evaluate_candidate(
        self,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        min_years_experience: int,
        resume_text: str,
        skills_weight: int = 50,
        experience_weight: int = 35,
        education_weight: int = 15,
        page_images_base64: Optional[List[str]] = None
    ) -> EvaluationResult:
        pass

    @abstractmethod
    async def stream_summary(
        self,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        min_years_experience: int,
        resume_text: str,
        skills_weight: int = 50,
        experience_weight: int = 35,
        education_weight: int = 15
    ) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def enhance_job_description(
        self,
        raw_text: str
    ) -> Dict[str, Any]:
        pass
