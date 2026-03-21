from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from . import Base


class InterviewActivityLog(Base):
    __tablename__ = "interview_activity_logs"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(ForeignKey("interview_candidates.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(128), nullable=False)
    meta = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("InterviewCandidate", back_populates="activity_logs")
