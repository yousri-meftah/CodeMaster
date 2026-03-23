from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
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
from database import get_db
from schemas import (
    CandidateSessionOut,
    InterviewLogIn,
    InterviewSaveIn,
    InterviewSubmitIn,
    InterviewCandidateOut,
)

router = APIRouter()


def _load_candidate_with_interview(db: Session, token: str) -> InterviewCandidate:
    candidate = get_candidate_by_token(db, token)
    return (
        db.query(InterviewCandidate)
        .options(joinedload(InterviewCandidate.interview).joinedload(Interview.interview_problems).joinedload(InterviewProblem.problem))
        .filter(InterviewCandidate.id == candidate.id)
        .first()
    )


@router.get("/session", response_model=CandidateSessionOut)
def get_session(token: str, db: Session = Depends(get_db)):
    candidate = _load_candidate_with_interview(db, token)
    return serialize_candidate_session(candidate)


@router.post("/start", response_model=CandidateSessionOut)
def start_session(token: str, db: Session = Depends(get_db)):
    candidate = _load_candidate_with_interview(db, token)
    if candidate.status == "submitted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview already submitted",
        )
    if candidate.status == "expired":
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Interview session expired",
        )
    if candidate.status == "pending":
        now = datetime.now(timezone.utc)
        candidate.status = "started"
        candidate.started_at = now
        candidate.last_seen_at = now
        db.commit()
        db.refresh(candidate)
        candidate = _load_candidate_with_interview(db, token)
    return serialize_candidate_session(candidate)


@router.post("/save", response_model=InterviewCandidateOut)
def save_interview_code(payload: InterviewSaveIn, db: Session = Depends(get_db)):
    candidate = require_started_candidate(db, payload.token)
    save_candidate_code(
        db=db,
        candidate=candidate,
        problem_id=payload.problem_id,
        language=payload.language,
        code=payload.code,
        change_summary=payload.change_summary,
    )
    db.refresh(candidate)
    return candidate


@router.post("/submit", response_model=InterviewCandidateOut)
def submit_interview(payload: InterviewSubmitIn, db: Session = Depends(get_db)):
    candidate = require_started_candidate(db, payload.token)
    return submit_candidate_interview(db, candidate)


@router.post("/log", response_model=InterviewCandidateOut)
def log_interview_event(payload: InterviewLogIn, db: Session = Depends(get_db)):
    candidate = require_started_candidate(db, payload.token)
    create_activity_log(db, candidate, payload.event_type, payload.meta)
    db.refresh(candidate)
    return candidate
