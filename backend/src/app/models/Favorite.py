
from . import Base
from sqlalchemy import (
    Column, ForeignKey
)

class Favorite(Base):
    __tablename__ = "favorites"
    user_id = Column(ForeignKey("users.id"), primary_key=True)
    problem_id = Column(ForeignKey("problems.id"), primary_key=True)
