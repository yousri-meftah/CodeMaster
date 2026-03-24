from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base
class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    problem_tags = relationship("ProblemTag", back_populates="tag", cascade="all, delete-orphan")
    problems = relationship("Problem", secondary="problem_tags", viewonly=True)