from datetime import datetime
from typing import List, Optional
from . import Base
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Table,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, Session, declarative_base
class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey("users.id"))
    problem_id = Column(ForeignKey("problems.id"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    problem = relationship("Problem", back_populates="comments")
