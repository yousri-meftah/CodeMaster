from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from . import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(64), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    settings = Column(JSON, nullable=False, default=dict)
    recruiter_id = Column(ForeignKey("users.id"), nullable=False)
    status = Column(String(32), nullable=False, default="draft", server_default="draft")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    recruiter = relationship("User", back_populates="interviews")
    interview_problems = relationship("InterviewProblem", back_populates="interview", cascade="all, delete-orphan")
    candidates = relationship("InterviewCandidate", back_populates="interview", cascade="all, delete-orphan")
