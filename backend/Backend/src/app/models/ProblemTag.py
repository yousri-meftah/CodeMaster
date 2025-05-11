from datetime import datetime
from typing import List, Optional
from . import Base
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Table,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, Session, declarative_base
class ProblemTag(Base):
    __tablename__ = "problem_tags"

    id = Column(Integer, primary_key=True)
    problem_id = Column(ForeignKey("problems.id"), nullable=False)
    tag_id = Column(ForeignKey("tags.id"), nullable=False)

    problem = relationship("Problem", back_populates="problem_tags")
    tag = relationship("Tag", back_populates="problem_tags")

    __table_args__ = (UniqueConstraint("problem_id", "tag_id", name="uq_problem_tag"),)
