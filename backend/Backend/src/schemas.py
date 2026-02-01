from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

# ---------- TAG ----------
class TagIn(BaseModel):
    name: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    is_admin: Optional[bool]= False

    class Config:
        orm_mode = True


class TagOut(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

# ---------- PROBLEM TEST CASE ----------
class ProblemTestCaseIn(BaseModel):
    input_text: str
    output_text: str
    is_sample: Optional[bool] = True
    order: Optional[int] = 0

class ProblemTestCaseOut(BaseModel):
    id: int
    input_text: str
    output_text: str
    is_sample: bool
    order: int

    class Config:
        orm_mode = True

# ---------- PROBLEM STARTER CODE ----------
class ProblemStarterCodeIn(BaseModel):
    language: str
    code: str

class ProblemStarterCodeOut(BaseModel):
    id: int
    language: str
    code: str

    class Config:
        orm_mode = True

# ---------- PROBLEM ----------
class ProblemIn(BaseModel):
    title: str
    difficulty: str
    external_link: Optional[str]
    description: Optional[str] = None
    constraints: Optional[str] = None
    tag_ids: List[int]
    test_cases: Optional[List[ProblemTestCaseIn]] = None
    starter_codes: Optional[List[ProblemStarterCodeIn]] = None

class ProblemOut(BaseModel):
    id: int
    title: str
    difficulty: str
    external_link: Optional[str]
    description: Optional[str] = None
    constraints: Optional[str] = None
    tags: List[TagOut]
    test_cases: List[ProblemTestCaseOut] = []
    starter_codes: List[ProblemStarterCodeOut] = []

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

# ---------- ARTICLE ----------
class ArticleIn(BaseModel):
    title: str
    content: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    author: Optional[str] = None
    read_time: Optional[int] = None
    categories: Optional[List[str]] = None

class ArticleOut(BaseModel):
    id: int
    title: str
    content: str
    summary: Optional[str] = None
    image_url: Optional[str] = None
    author: Optional[str] = None
    read_time: Optional[int] = None
    categories: Optional[List[str]] = None
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True

# ---------- SUBMISSION ----------
class SubmissionRequest(BaseModel):
    problem_id: int
    language: str
    code: str


class SubmissionCaseResult(BaseModel):
    id: Optional[int]
    is_sample: bool
    input_text: Optional[str] = None
    output_text: Optional[str] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    status: Optional[str] = None
    time: Optional[str] = None
    memory: Optional[int] = None
    passed: bool


class SubmissionSummary(BaseModel):
    verdict: str
    passed: int
    total: int
    cases: List[SubmissionCaseResult]
    hidden: Optional[dict] = None
