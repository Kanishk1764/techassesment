import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

def generate_id():
    return str(uuid.uuid4())

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_id)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(Text, nullable=False)  # JSON string array
    min_years_experience = Column(Integer, nullable=False, default=0)
    
    # Configurable weightage (sum must be 100)
    skills_weight = Column(Integer, nullable=False, default=50)
    experience_weight = Column(Integer, nullable=False, default=35)
    education_weight = Column(Integer, nullable=False, default=15)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
    evaluations = relationship("Evaluation", back_populates="job")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_id)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    resume_text = Column(Text, nullable=False)
    years_experience = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="new")  # new | shortlisted | rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="candidates")
    evaluations = relationship("Evaluation", back_populates="candidate", cascade="all, delete-orphan", order_by="desc(Evaluation.created_at)")

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=generate_id)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    match_score = Column(Integer, nullable=False)
    matched_skills = Column(Text, nullable=False)  # JSON string array
    missing_skills = Column(Text, nullable=False)  # JSON string array
    summary = Column(Text, nullable=False)
    recommendation = Column(String(50), nullable=False)  # strong | maybe | no
    status = Column(String(50), nullable=False, default="complete")  # complete | error | pending
    error_message = Column(Text, nullable=True)
    raw_prompt = Column(Text, nullable=True)
    raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="evaluations")
    job = relationship("Job", back_populates="evaluations")
