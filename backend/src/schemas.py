from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

# ---------- TAG ----------
class TagIn(BaseModel):
    name: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    is_admin: Optional[bool] = False
    role: str = "user"
    auth_provider: Optional[str] = "local"
    session_id: Optional[str] = None
    token_version: int = 0
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

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


# ---------- INTERVIEWS ----------
class InterviewProblemRef(BaseModel):
    problem_id: int
    order: int = 0


class InterviewIn(BaseModel):
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: int
    availability_days: int = 7
    settings: dict = Field(default_factory=dict)
    status: str = "draft"
    problems: List[InterviewProblemRef]


class InterviewOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: int
    availability_days: int
    settings: dict
    recruiter_id: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class InterviewProblemOut(BaseModel):
    id: int
    title: str
    difficulty: str
    description: Optional[str] = None
    constraints: Optional[str] = None
    order: int


class InterviewDetailOut(InterviewOut):
    problems: List[InterviewProblemOut]


class InterviewCandidateBatchIn(BaseModel):
    emails: List[str]


class InterviewCandidateOut(BaseModel):
    id: int
    email: str
    token: str
    status: str
    invite_status: str = "pending"
    invite_error: Optional[str] = None
    invite_sent_at: Optional[datetime] = None
    invite_attempts: int = 0
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InterviewInviteResultOut(BaseModel):
    candidate_id: int
    email: str
    status: str
    error: Optional[str] = None


class InterviewCandidateBatchOut(BaseModel):
    candidates: List[InterviewCandidateOut]
    invite_results: List[InterviewInviteResultOut]


class InterviewResendInviteOut(BaseModel):
    candidate: InterviewCandidateOut
    invite: InterviewInviteResultOut


class InterviewCandidatesPageOut(BaseModel):
    items: List[InterviewCandidateOut]
    total: int
    page: int
    page_size: int


class InterviewCandidateReviewOut(InterviewCandidateOut):
    submission_count: int
    log_count: int
    completed_problem_count: int
    risk_score: int


class InterviewSubmissionOut(BaseModel):
    id: int
    candidate_id: int
    candidate_email: str
    problem_id: int
    language: str
    code: str
    change_summary: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class InterviewActivityLogOut(BaseModel):
    id: int
    candidate_id: int
    candidate_email: str
    event_type: str
    meta: Optional[dict] = None
    timestamp: Optional[datetime] = None


class InterviewMediaSegmentOut(BaseModel):
    id: int
    candidate_id: int
    candidate_email: Optional[str] = None
    sequence_number: int
    media_kind: str
    mime_type: str
    storage_path: Optional[str] = None
    size_bytes: int
    duration_ms: Optional[int] = None
    checksum: str
    upload_status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    download_url: Optional[str] = None


class InterviewMediaSegmentStatusOut(BaseModel):
    uploaded_segments: int
    latest_sequence_number: Optional[int] = None
    statuses: List[InterviewMediaSegmentOut]


class InterviewMediaFinalizeIn(BaseModel):
    token: str


class AuthResponseOut(BaseModel):
    token_type: str = "bearer"
    user: UserOut
    requires_role_selection: bool = False


class OAuthStartOut(BaseModel):
    authorization_url: str
    provider: str


class SocialRoleSelectionIn(BaseModel):
    role: str


class CandidateSessionOut(BaseModel):
    interview_id: int
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: int
    availability_days: int
    status: str
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    available_until: Optional[datetime] = None
    candidate_email: str
    settings: dict
    problems: List[InterviewProblemOut]


class InterviewSaveIn(BaseModel):
    token: str
    problem_id: int
    language: str
    code: str
    change_summary: Optional[dict] = None


class InterviewSubmitIn(BaseModel):
    token: str


class InterviewLogIn(BaseModel):
    token: str
    event_type: str
    meta: Optional[dict] = None


class InterviewCandidateStatusUpdateIn(BaseModel):
    status: str
