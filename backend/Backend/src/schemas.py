from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

# ---------- TAG ----------
class TagIn(BaseModel):
    name: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    is_admin: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)


class TagOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ---------- PROBLEM STARTER CODE ----------
class ProblemStarterCodeIn(BaseModel):
    language: str
    code: str


class ProblemStarterCodeOut(BaseModel):
    id: int
    language: str
    code: str

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ---------- SAVED SOLUTION ----------
class SavedSolutionIn(BaseModel):
    problem_id: int
    code: str


class SavedSolutionOut(BaseModel):
    id: int
    problem_id: int
    code: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ---------- ROADMAP ----------
class RoadmapIn(BaseModel):
    title: str
    problem_ids_ordered: List[int]


class RoadmapOut(BaseModel):
    id: int
    title: str
    problem_ids_ordered: List[int]

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ---------- EXECUTION ----------
class ExecutionRequest(BaseModel):
    code: str
    input: Optional[str] = None
    language: str = "algo"


class ExecutionResult(BaseModel):
    stdout: str
    stderr: Optional[str] = None
    status: str = "ok"


class SubmissionOut(BaseModel):
    id: int
    status: Optional[str] = None
    output_text: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


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


class SubmissionListItem(BaseModel):
    id: int
    problem_id: int
    language: str
    verdict: Optional[str] = None
    passed: Optional[int] = None
    total: Optional[int] = None
    is_submit: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProblemPageOut(BaseModel):
    items: List[ProblemOut]
    total: int
    page: int
    page_size: int
