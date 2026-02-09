from sqlalchemy import Column, Integer, Text, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from . import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"), nullable=True)
    problem_id = Column(ForeignKey("problems.id"), nullable=True)
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    input_text = Column(Text, nullable=True)
    output_text = Column(Text, nullable=True)
    status = Column(String, nullable=True)
    verdict = Column(String, nullable=True)
    passed = Column(Integer, nullable=True)
    total = Column(Integer, nullable=True)
    runtime_ms = Column(Integer, nullable=True)
    memory_kb = Column(Integer, nullable=True)
    is_submit = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    problem = relationship("Problem")
