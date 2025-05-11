from datetime import datetime
from typing import List, Optional
from . import Base
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Table,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, Session, declarative_base
class RoadmapProblem(Base):
    __tablename__ = "roadmap_problems"
    id = Column(Integer, primary_key=True)
    roadmap_id = Column(ForeignKey("roadmaps.id"))
    problem_id = Column(ForeignKey("problems.id"))
    order = Column(Integer)

    roadmap = relationship("Roadmap", back_populates="problems")
    problem = relationship("Problem", back_populates="roadmap_links")

    __table_args__ = (UniqueConstraint("roadmap_id", "problem_id", name="unique_roadmap_problem"),)
