import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Interview,
    InterviewActivityLog,
    InterviewCandidate,
    InterviewProblem,
    InterviewSubmission,
    Problem,
)


def generate_candidate_token() -> str:
    return secrets.token_urlsafe(32)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def load_interview_or_404(db: Session, interview_id: int) -> Interview:
    interview = db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    return interview


def ensure_problem_ids_exist(db: Session, problems: list) -> list[Problem]:
    problem_ids = [item.problem_id for item in problems]
    rows = db.query(Problem).filter(Problem.id.in_(problem_ids)).all() if problem_ids else []
    found = {row.id for row in rows}
    missing = [problem_id for problem_id in problem_ids if problem_id not in found]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown problem ids: {missing}",
        )
    return rows


def replace_interview_problems(db: Session, interview: Interview, problems: list) -> None:
    ensure_problem_ids_exist(db, problems)
    db.query(InterviewProblem).filter(InterviewProblem.interview_id == interview.id).delete()
    for item in problems:
        db.add(
            InterviewProblem(
                interview_id=interview.id,
                problem_id=item.problem_id,
                order=item.order,
            )
        )


def compute_expires_at(candidate: InterviewCandidate) -> datetime | None:
    started_at = _ensure_aware(candidate.started_at)
    if not started_at:
        return None
    return started_at + timedelta(minutes=candidate.interview.duration_minutes)


def compute_available_until(candidate: InterviewCandidate) -> datetime | None:
    created_at = _ensure_aware(candidate.created_at)
    if not created_at:
        return None
    return created_at + timedelta(days=candidate.interview.availability_days)


def mark_candidate_expired(candidate: InterviewCandidate) -> None:
    now = _utcnow()
    candidate.status = "expired"
    candidate.last_seen_at = now
    if not candidate.submitted_at:
        candidate.submitted_at = now


def expire_candidate_if_needed(candidate: InterviewCandidate) -> None:
    if candidate.status in {"submitted", "expired"}:
        return
    if candidate.status == "pending":
        available_until = compute_available_until(candidate)
        if available_until and _utcnow() >= available_until:
            mark_candidate_expired(candidate)
            return
    expires_at = compute_expires_at(candidate)
    if expires_at and _utcnow() >= expires_at:
        mark_candidate_expired(candidate)


def get_candidate_by_token(db: Session, token: str, allow_expired: bool = False) -> InterviewCandidate:
    candidate = (
        db.query(InterviewCandidate)
        .filter(InterviewCandidate.token == token)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid candidate token")
    expire_candidate_if_needed(candidate)
    db.commit()
    db.refresh(candidate)
    if candidate.status == "expired" and not allow_expired:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Interview session expired")
    return candidate


def require_started_candidate(db: Session, token: str) -> InterviewCandidate:
    candidate = get_candidate_by_token(db, token)
    if candidate.status == "submitted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interview already submitted")
    if candidate.status != "started":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview not started")
    candidate.last_seen_at = _utcnow()
    db.commit()
    db.refresh(candidate)
    return candidate


def serialize_interview_problem(problem_link: InterviewProblem) -> dict:
    problem = problem_link.problem
    return {
        "id": problem.id,
        "title": problem.title,
        "difficulty": problem.difficulty,
        "description": problem.description,
        "constraints": problem.constraints,
        "order": problem_link.order,
    }


def serialize_candidate_session(candidate: InterviewCandidate) -> dict:
    interview = candidate.interview
    problems = sorted(interview.interview_problems, key=lambda item: item.order)
    return {
        "interview_id": interview.id,
        "title": interview.title,
        "description": interview.description,
        "difficulty": interview.difficulty,
        "duration_minutes": interview.duration_minutes,
        "availability_days": interview.availability_days,
        "status": candidate.status,
        "started_at": candidate.started_at,
        "submitted_at": candidate.submitted_at,
        "expires_at": compute_expires_at(candidate),
        "available_until": compute_available_until(candidate),
        "candidate_email": candidate.email,
        "settings": interview.settings or {},
        "problems": [serialize_interview_problem(item) for item in problems],
    }


def validate_candidate_problem(candidate: InterviewCandidate, problem_id: int) -> None:
    if not any(item.problem_id == problem_id for item in candidate.interview.interview_problems):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Problem not part of interview")


def save_candidate_code(
    db: Session,
    candidate: InterviewCandidate,
    problem_id: int,
    language: str,
    code: str,
) -> InterviewSubmission:
    validate_candidate_problem(candidate, problem_id)
    submission = (
        db.query(InterviewSubmission)
        .filter(
            InterviewSubmission.candidate_id == candidate.id,
            InterviewSubmission.problem_id == problem_id,
        )
        .first()
    )
    if submission:
        submission.language = language
        submission.code = code
    else:
        submission = InterviewSubmission(
            candidate_id=candidate.id,
            problem_id=problem_id,
            language=language,
            code=code,
        )
        db.add(submission)
    candidate.last_seen_at = _utcnow()
    db.commit()
    db.refresh(submission)
    return submission


def submit_candidate_interview(db: Session, candidate: InterviewCandidate) -> InterviewCandidate:
    if candidate.status == "submitted":
        return candidate
    candidate.status = "submitted"
    now = _utcnow()
    if not candidate.started_at:
        candidate.started_at = now
    candidate.submitted_at = now
    candidate.last_seen_at = now
    db.commit()
    db.refresh(candidate)
    return candidate


def create_activity_log(db: Session, candidate: InterviewCandidate, event_type: str, meta: dict | None) -> InterviewActivityLog:
    candidate.last_seen_at = _utcnow()
    log = InterviewActivityLog(candidate_id=candidate.id, event_type=event_type, meta=meta)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
