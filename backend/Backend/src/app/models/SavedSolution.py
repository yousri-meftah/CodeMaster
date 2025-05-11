from datetime import datetime
from typing import List, Optional
from . import Base
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Table,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, Session, declarative_base


class SavedSolution(Base):
    __tablename__ = "saved_solutions"
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"))
    problem_id = Column(ForeignKey("problems.id"))
    code = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_solutions")
    problem = relationship("Problem", back_populates="solutions")

    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="unique_user_problem_solution"),)
