from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from . import Base


class InterviewSubmission(Base):
    __tablename__ = "interview_submissions"
    __table_args__ = (UniqueConstraint("candidate_id", "problem_id", name="uq_candidate_problem_submission"),)

    id = Column(Integer, primary_key=True)
    candidate_id = Column(ForeignKey("interview_candidates.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(64), nullable=False)
    code = Column(Text, nullable=False)
    change_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    candidate = relationship("InterviewCandidate", back_populates="submissions")
    problem = relationship("Problem")
