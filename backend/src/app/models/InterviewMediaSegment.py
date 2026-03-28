from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from . import Base


class InterviewMediaSegment(Base):
    __tablename__ = "interview_media_segments"
    __table_args__ = (
        UniqueConstraint("candidate_id", "sequence_number", name="uq_interview_media_candidate_sequence"),
    )

    id = Column(Integer, primary_key=True)
    candidate_id = Column(ForeignKey("interview_candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)
    media_kind = Column(String(32), nullable=False)
    mime_type = Column(String(128), nullable=False)
    storage_path = Column(String(1024), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    duration_ms = Column(Integer, nullable=True)
    checksum = Column(String(128), nullable=False)
    upload_status = Column(String(32), nullable=False, default="uploaded", server_default="uploaded")
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("InterviewCandidate", back_populates="media_segments")
