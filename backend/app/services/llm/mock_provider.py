import json
import re
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from .base import LlmProvider, EvaluationResult

class MockProvider(LlmProvider):
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
        resume_lower = resume_text.lower()

        if len(resume_text.strip()) < 20 or "gibberish_test_fail" in resume_lower:
            empty_result = {
                "match_score": 0,
                "matched_skills": [],
                "missing_skills": [s for s in required_skills if s.strip()],
                "summary": "The submitted document lacks verifiable resume credentials to evaluate against role requirements.",
                "recommendation": "no",
            }
            return EvaluationResult(
                match_score=0,
                matched_skills=[],
                missing_skills=empty_result["missing_skills"],
                summary=empty_result["summary"],
                recommendation="no",
                raw_prompt=f"[MOCK PROMPT]\nJob: {job_title}\nSkills: {', '.join(required_skills)}\n\nResume:\n{resume_text}",
                raw_response=json.dumps(empty_result, indent=2),
            )

        # Match skills
        matched_skills = []
        missing_skills = []
        for skill in required_skills:
            clean = skill.strip()
            if not clean:
                continue
            pattern = rf"\b{re.escape(clean)}\b"
            if re.search(pattern, resume_text, re.IGNORECASE) or clean.lower() in resume_lower:
                matched_skills.append(clean)
            else:
                missing_skills.append(clean)

        # Extract experience years from text
        exp_matches = re.findall(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)?", resume_text, re.IGNORECASE)
        max_exp = 0.0
        for m in exp_matches:
            try:
                val = float(m)
                if val > max_exp and val <= 40:
                    max_exp = val
            except ValueError:
                pass

        # Check date range intervals
        year_ranges = re.findall(r"\b(20\d\d|19\d\d)\s*[-–—to]+\s*(20\d\d|present|current|now)\b", resume_text, re.IGNORECASE)
        if year_ranges and max_exp == 0.0:
            for s, e in year_ranges:
                try:
                    s_yr = int(s)
                    e_yr = 2026 if e.lower() in ["present", "current", "now"] else int(e)
                    if e_yr >= s_yr:
                        max_exp += (e_yr - s_yr)
                except ValueError:
                    pass

        # Calculate scores using user-defined weights
        total_skills = max(1, len(required_skills))
        skill_ratio = len(matched_skills) / total_skills
        skill_score = (skill_ratio * skills_weight)

        exp_score = float(experience_weight)
        experience_deficit = False
        if min_years_experience > 0:
            if max_exp < min_years_experience:
                experience_deficit = True
                ratio = max_exp / min_years_experience
                # Strict quadratic penalty for experience shortfall
                exp_score = (ratio ** 2) * experience_weight
            else:
                exp_score = float(experience_weight)

        # Domain / general qualification score
        edu_score = float(education_weight) * 0.85

        raw_match_score = int(round(skill_score + exp_score + edu_score))
        
        # Hard gate: if experience deficit is severe, cap score and prevent "strong" recommendation
        if experience_deficit:
            if (max_exp / min_years_experience) < 0.7:
                match_score = min(raw_match_score, 65)
            else:
                match_score = min(raw_match_score, 74)
        else:
            match_score = min(100, max(0, raw_match_score))

        # Recommendation logic
        if match_score >= 80 and not experience_deficit:
            recommendation = "strong"
        elif match_score >= 50:
            recommendation = "maybe"
        else:
            recommendation = "no"

        # Construct calibrated summary
        summary_parts = []
        if matched_skills:
            top_matched = ", ".join(matched_skills[:3])
            extra = f" and {len(matched_skills) - 3} other skills" if len(matched_skills) > 3 else ""
            summary_parts.append(f"Candidate demonstrates proficiency in {top_matched}{extra}.")
        else:
            top_req = ", ".join(required_skills[:3])
            summary_parts.append(f"Candidate resume does not explicitly demonstrate required core skills such as {top_req}.")

        if experience_deficit:
            summary_parts.append(
                f"Candidate exhibits approximately {max_exp:.1f} year(s) of relevant experience, "
                f"which falls below the minimum requirement of {min_years_experience} years."
            )
        elif max_exp > 0:
            summary_parts.append(
                f"Profile demonstrates approximately {max_exp:.1f} year(s) of verified experience, "
                f"meeting the {min_years_experience} year requirement."
            )
        else:
            summary_parts.append(f"Experience duration is not explicitly quantified relative to the {min_years_experience} year threshold.")

        if recommendation == "strong":
            summary_parts.append("Overall profile represents a strong technical match for the position.")
        elif recommendation == "maybe":
            summary_parts.append("Profile presents potential alignment with slight experience or skill gaps to verify during screening.")
        else:
            summary_parts.append("Profile shows substantial gaps across the core required qualification criteria.")

        summary = " ".join(summary_parts)
        raw_prompt = f"[MOCK PROMPT]\nJob: {job_title}\nRequired Skills: {', '.join(required_skills)}\nMin Experience: {min_years_experience}\nWeights: Skills={skills_weight}%, Exp={experience_weight}%, Domain={education_weight}%\n\nResume Sample:\n{resume_text[:400]}..."
        raw_response = json.dumps({
            "match_score": match_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "actual_years_experience": max_exp,
            "summary": summary,
            "recommendation": recommendation,
        }, indent=2)

        return EvaluationResult(
            match_score=match_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            summary=summary,
            recommendation=recommendation,
            raw_prompt=raw_prompt,
            raw_response=raw_response,
        )

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
        eval_res = await self.evaluate_candidate(
            job_title, job_description, required_skills, min_years_experience, resume_text,
            skills_weight, experience_weight, education_weight
        )
        words = eval_res.summary.split(" ")
        for i, word in enumerate(words):
            chunk = ("" if i == 0 else " ") + word
            yield chunk
            await asyncio.sleep(0.02)

    async def enhance_job_description(self, raw_text: str) -> Dict[str, Any]:
        # Extract title heuristically
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        title = "Software Engineer"
        if lines:
            first = lines[0].replace("#", "").strip()
            if len(first) < 50:
                title = first

        # Generate clean structured markdown
        description = f"""## About the Role
We are seeking a talented **{title}** to join our fast-paced engineering team. You will lead key technical initiatives, architect robust systems, and deliver reliable solutions.

## Key Responsibilities
- Design, build, and maintain scalable web and backend applications.
- Collaborate with cross-functional product and design teams.
- Ensure high code quality, security, and performance standards.
- Mentor team members and drive engineering best practices.

## Required Qualifications
- Proven experience building and deploying production systems.
- Strong problem-solving abilities and clear technical communication.
- Solid understanding of modern software development life cycles.

## Preferred Qualifications
- Experience with cloud infrastructure, CI/CD, and automated testing."""

        # Extract common tech keywords from raw text
        tech_pool = ["Python", "TypeScript", "React", "Node.js", "Docker", "PostgreSQL", "FastAPI", "AWS", "GraphQL", "Kubernetes", "SQL", "Tailwind CSS", "Redis"]
        matched = [k for k in tech_pool if k.lower() in raw_text.lower()]
        if not matched:
            matched = ["TypeScript", "React", "Python", "Docker"]

        return {
            "title": title,
            "description": description,
            "required_skills": matched[:6],
            "min_years_experience": 3
        }
