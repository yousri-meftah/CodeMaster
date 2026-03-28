from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from . import Base


class InterviewCandidate(Base):
    __tablename__ = "interview_candidates"

    id = Column(Integer, primary_key=True)
    interview_id = Column(ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    token = Column(String(255), nullable=False, unique=True, index=True)
    status = Column(String(32), nullable=False, default="pending", server_default="pending")
    invite_status = Column(String(32), nullable=False, default="pending", server_default="pending")
    invite_error = Column(String(1024), nullable=True)
    invite_sent_at = Column(DateTime(timezone=True), nullable=True)
    invite_attempts = Column(Integer, nullable=False, default=0, server_default="0")
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview = relationship("Interview", back_populates="candidates")
    submissions = relationship("InterviewSubmission", back_populates="candidate", cascade="all, delete-orphan")
    activity_logs = relationship("InterviewActivityLog", back_populates="candidate", cascade="all, delete-orphan")
    media_segments = relationship("InterviewMediaSegment", back_populates="candidate", cascade="all, delete-orphan")
