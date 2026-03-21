from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.controllers.auth import require_recruiter
from app.models import Interview, InterviewActivityLog, InterviewCandidate, InterviewProblem, InterviewSubmission
from app.services.interview import (
    generate_candidate_token,
    load_interview_or_404,
    replace_interview_problems,
)
from database import get_db
from schemas import (
    InterviewCandidateBatchIn,
    InterviewCandidateOut,
    InterviewDetailOut,
    InterviewIn,
    InterviewSubmissionOut,
    InterviewActivityLogOut,
)

router = APIRouter()


def _load_interview_detail(db: Session, interview_id: int) -> Interview | None:
    return (
        db.query(Interview)
        .options(joinedload(Interview.interview_problems).joinedload(InterviewProblem.problem))
        .filter(Interview.id == interview_id)
        .first()
    )


def _ensure_owner_or_admin(interview: Interview, user) -> None:
    if getattr(user, "is_admin", False) or getattr(user, "role", "user") == "admin":
        return
    if interview.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _serialize_interview(interview: Interview) -> dict:
    return {
        "id": interview.id,
        "title": interview.title,
        "description": interview.description,
        "difficulty": interview.difficulty,
        "duration_minutes": interview.duration_minutes,
        "settings": interview.settings or {},
        "recruiter_id": interview.recruiter_id,
        "status": interview.status,
        "problems": [
            {
                "id": link.problem.id,
                "title": link.problem.title,
                "difficulty": link.problem.difficulty,
                "description": link.problem.description,
                "constraints": link.problem.constraints,
                "order": link.order,
            }
            for link in sorted(interview.interview_problems, key=lambda item: item.order)
        ],
    }


@router.post("/", response_model=InterviewDetailOut)
def create_interview(data: InterviewIn, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = Interview(
        title=data.title,
        description=data.description,
        difficulty=data.difficulty,
        duration_minutes=data.duration_minutes,
        settings=data.settings or {},
        recruiter_id=user.id,
        status=data.status,
    )
    db.add(interview)
    db.flush()
    replace_interview_problems(db, interview, data.problems)
    db.commit()
    interview = _load_interview_detail(db, interview.id)
    return _serialize_interview(interview)


@router.put("/{interview_id}", response_model=InterviewDetailOut)
def update_interview(interview_id: int, data: InterviewIn, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = _load_interview_detail(db, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    _ensure_owner_or_admin(interview, user)
    interview.title = data.title
    interview.description = data.description
    interview.difficulty = data.difficulty
    interview.duration_minutes = data.duration_minutes
    interview.settings = data.settings or {}
    interview.status = data.status
    replace_interview_problems(db, interview, data.problems)
    db.commit()
    interview = _load_interview_detail(db, interview_id)
    return _serialize_interview(interview)


@router.post("/{interview_id}/candidates", response_model=list[InterviewCandidateOut])
def add_candidates(
    interview_id: int,
    data: InterviewCandidateBatchIn,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    created = []
    existing = {candidate.email.lower(): candidate for candidate in interview.candidates}
    for email in data.emails:
        normalized = (email or "").strip().lower()
        if not normalized:
            continue
        candidate = existing.get(normalized)
        if candidate:
            created.append(candidate)
            continue
        candidate = InterviewCandidate(
            interview_id=interview.id,
            email=normalized,
            token=generate_candidate_token(),
        )
        db.add(candidate)
        created.append(candidate)
        existing[normalized] = candidate
    db.commit()
    for item in created:
        db.refresh(item)
    return created


@router.get("/{interview_id}/candidates", response_model=list[InterviewCandidateOut])
def list_candidates(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = db.query(Interview).options(joinedload(Interview.candidates)).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    _ensure_owner_or_admin(interview, user)
    return sorted(interview.candidates, key=lambda candidate: candidate.id)


@router.get("/{interview_id}/submissions", response_model=list[InterviewSubmissionOut])
def list_interview_submissions(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    rows = (
        db.query(InterviewSubmission)
        .join(InterviewCandidate, InterviewCandidate.id == InterviewSubmission.candidate_id)
        .filter(InterviewCandidate.interview_id == interview_id)
        .order_by(InterviewSubmission.created_at.desc(), InterviewSubmission.id.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "candidate_id": row.candidate_id,
            "candidate_email": row.candidate.email,
            "problem_id": row.problem_id,
            "language": row.language,
            "code": row.code,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/{interview_id}/logs", response_model=list[InterviewActivityLogOut])
def list_interview_logs(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    rows = (
        db.query(InterviewActivityLog)
        .join(InterviewCandidate, InterviewCandidate.id == InterviewActivityLog.candidate_id)
        .filter(InterviewCandidate.interview_id == interview_id)
        .order_by(InterviewActivityLog.timestamp.desc(), InterviewActivityLog.id.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "candidate_id": row.candidate_id,
            "candidate_email": row.candidate.email,
            "event_type": row.event_type,
            "meta": row.meta,
            "timestamp": row.timestamp,
        }
        for row in rows
    ]
