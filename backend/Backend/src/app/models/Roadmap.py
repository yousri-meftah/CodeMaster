from datetime import datetime
from typing import List, Optional
from . import Base
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Table,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, Session, declarative_base
class Roadmap(Base):
    __tablename__ = "roadmaps"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)

    problems = relationship("RoadmapProblem", back_populates="roadmap", cascade="all, delete")
