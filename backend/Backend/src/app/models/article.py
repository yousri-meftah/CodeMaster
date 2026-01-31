from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from . import Base


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    author = Column(String, nullable=True)
    read_time = Column(Integer, nullable=True)
    categories = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
