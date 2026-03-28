from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Interview, InterviewCandidate, InterviewProblem
from app.services.interview import (
    create_activity_log,
    get_candidate_by_token,
    require_started_candidate,
    save_candidate_code,
    serialize_candidate_session,
    submit_candidate_interview,
)


def load_candidate_with_interview(db: Session, token: str) -> InterviewCandidate:
    candidate = get_candidate_by_token(db, token, allow_expired=True)
    return (
        db.query(InterviewCandidate)
        .options(
            joinedload(InterviewCandidate.interview)
            .joinedload(Interview.interview_problems)
            .joinedload(InterviewProblem.problem)
        )
        .filter(InterviewCandidate.id == candidate.id)
        .first()
    )


def get_candidate_session(*, db: Session, token: str) -> dict:
    candidate = load_candidate_with_interview(db, token)
    if candidate.status == "expired":
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Interview session expired")
    return serialize_candidate_session(candidate)


def start_candidate_session(*, db: Session, token: str) -> dict:
    candidate = load_candidate_with_interview(db, token)
    if candidate.status == "submitted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interview already submitted")
    if candidate.status == "expired":
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Interview session expired")
    if candidate.status == "pending":
        now = datetime.now(timezone.utc)
        candidate.status = "started"
        candidate.started_at = now
        candidate.last_seen_at = now
        db.commit()
        db.refresh(candidate)
        candidate = load_candidate_with_interview(db, token)
    return serialize_candidate_session(candidate)


def save_candidate_interview_code(*, db: Session, token: str, problem_id: int, language: str, code: str, change_summary: dict | None) -> InterviewCandidate:
    candidate = require_started_candidate(db, token)
    save_candidate_code(
        db=db,
        candidate=candidate,
        problem_id=problem_id,
        language=language,
        code=code,
        change_summary=change_summary,
    )
    db.refresh(candidate)
    return candidate


def submit_candidate_session(*, db: Session, token: str) -> InterviewCandidate:
    candidate = require_started_candidate(db, token)
    return submit_candidate_interview(db, candidate)


def log_candidate_event(*, db: Session, token: str, event_type: str, meta: dict | None) -> InterviewCandidate:
    candidate = require_started_candidate(db, token)
    create_activity_log(db, candidate, event_type, meta)
    db.refresh(candidate)
    return candidate
