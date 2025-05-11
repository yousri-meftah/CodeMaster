from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# ---------- TAG ----------
class TagIn(BaseModel):
    name: str

class TagOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

# ---------- PROBLEM ----------
class ProblemIn(BaseModel):
    title: str
    difficulty: str
    external_link: Optional[str]
    tag_ids: List[int]

class ProblemOut(BaseModel):
    id: int
    title: str
    difficulty: str
    external_link: Optional[str]
    tags: List[TagOut]

    class Config:
        orm_mode = True

# ---------- SAVED SOLUTION ----------
class SavedSolutionIn(BaseModel):
    problem_id: int
    code: str

class SavedSolutionOut(BaseModel):
    id: int
    problem_id: int
    code: str
    timestamp: datetime

    class Config:
        orm_mode = True

# ---------- COMMENT ----------
class CommentIn(BaseModel):
    problem_id: int
    content: str

class CommentOut(BaseModel):
    id: int
    user_id: int
    problem_id: int
    content: str
    created_at: datetime

    class Config:
        orm_mode = True

# ---------- ROADMAP ----------
class RoadmapIn(BaseModel):
    title: str
    problem_ids_ordered: List[int]

class RoadmapOut(BaseModel):
    id: int
    title: str
    problem_ids_ordered: List[int]

    class Config:
        orm_mode = True
