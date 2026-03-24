from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from . import Base


class InterviewProblem(Base):
    __tablename__ = "interview_problems"
    __table_args__ = (UniqueConstraint("interview_id", "problem_id", name="uq_interview_problem"),)

    id = Column(Integer, primary_key=True)
    interview_id = Column(ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(ForeignKey("problems.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, nullable=False, default=0)

    interview = relationship("Interview", back_populates="interview_problems")
    problem = relationship("Problem")
