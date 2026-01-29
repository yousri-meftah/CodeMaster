from sqlalchemy import Column, Integer, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from . import Base


class ProblemTestCase(Base):
    __tablename__ = "problem_test_cases"

    id = Column(Integer, primary_key=True)
    problem_id = Column(ForeignKey("problems.id"), nullable=False)
    input_text = Column(Text, nullable=False)
    output_text = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=True, nullable=False)
    order = Column(Integer, default=0, nullable=False)

    problem = relationship("Problem", back_populates="test_cases")
