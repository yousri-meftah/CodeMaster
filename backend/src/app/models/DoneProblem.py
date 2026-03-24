from . import Base
from sqlalchemy import (
    Column, ForeignKey
)
class DoneProblem(Base):
    __tablename__ = "done_problems"
    user_id = Column(ForeignKey("users.id"), primary_key=True)
    problem_id = Column(ForeignKey("problems.id"), primary_key=True)
