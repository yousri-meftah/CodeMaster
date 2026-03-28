from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base
from sqlalchemy import Boolean

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_admin = Column(Boolean, default=False)
    role = Column(String(32), nullable=False, default="user", server_default="user")
    token_version = Column(Integer, nullable=False, default=0, server_default="0")

    saved_solutions = relationship("SavedSolution", back_populates="user", cascade="all, delete")
    comments = relationship("Comment", back_populates="user", cascade="all, delete")
    favorites = relationship("Favorite", cascade="all, delete", lazy="joined")
    done_problems = relationship("DoneProblem", cascade="all, delete", lazy="joined")
    interviews = relationship("Interview", back_populates="recruiter", cascade="all, delete")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
