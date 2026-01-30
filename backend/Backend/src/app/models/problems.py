from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base
class Problem(Base):
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    external_link = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)

    problem_tags = relationship("ProblemTag", back_populates="problem", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="problem_tags", viewonly=True)
    comments = relationship("Comment", back_populates="problem", cascade="all, delete")
    solutions = relationship("SavedSolution", back_populates="problem", cascade="all, delete")
    roadmap_links = relationship("RoadmapProblem", back_populates="problem", cascade="all, delete")
    test_cases = relationship("ProblemTestCase", back_populates="problem", cascade="all, delete")
    starter_codes = relationship("ProblemStarterCode", back_populates="problem", cascade="all, delete")
