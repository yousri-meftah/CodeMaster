from sqlalchemy import Column, Integer, Text, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from . import Base


class ProblemStarterCode(Base):
    __tablename__ = "problem_starter_code"

    id = Column(Integer, primary_key=True)
    problem_id = Column(ForeignKey("problems.id"), nullable=False)
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)

    problem = relationship("Problem", back_populates="starter_codes")

    __table_args__ = (UniqueConstraint("problem_id", "language", name="uq_problem_language"),)
