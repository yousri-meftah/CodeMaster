from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.controllers.auth import require_recruiter
from app.models import Interview, InterviewActivityLog, InterviewCandidate, InterviewProblem, InterviewSubmission
from app.services.interview import (
    generate_candidate_token,
    load_interview_or_404,
    replace_interview_problems,
    send_candidate_invite,
)
from database import get_db
from schemas import (
    InterviewCandidateBatchIn,
    InterviewCandidateBatchOut,
    InterviewCandidateOut,
    InterviewCandidateReviewOut,
    InterviewResendInviteOut,
    InterviewCandidateStatusUpdateIn,
    InterviewCandidatesPageOut,
    InterviewDetailOut,
    InterviewIn,
    InterviewOut,
    InterviewSubmissionOut,
    InterviewActivityLogOut,
)

router = APIRouter()

ALLOWED_CANDIDATE_STATUSES = {"pending", "started", "submitted", "expired"}


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


def _ensure_owner(interview: Interview, user) -> None:
    if interview.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only interview owner can perform this action")


def _serialize_interview(interview: Interview) -> dict:
    return {
        "id": interview.id,
        "title": interview.title,
        "description": interview.description,
        "difficulty": interview.difficulty,
        "duration_minutes": interview.duration_minutes,
        "availability_days": interview.availability_days,
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


def _load_candidate_or_404(db: Session, interview_id: int, candidate_id: int) -> InterviewCandidate:
    candidate = (
        db.query(InterviewCandidate)
        .options(
            joinedload(InterviewCandidate.interview).joinedload(Interview.interview_problems),
            joinedload(InterviewCandidate.submissions),
            joinedload(InterviewCandidate.activity_logs),
        )
        .filter(
            InterviewCandidate.id == candidate_id,
            InterviewCandidate.interview_id == interview_id,
        )
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return candidate


def _serialize_candidate_review(candidate: InterviewCandidate) -> dict:
    risk_score = 0
    for log in candidate.activity_logs:
        if log.event_type in {"tab_hidden", "window_blur"}:
            risk_score += 3
        elif log.event_type in {"copy", "paste"}:
            risk_score += 2
        else:
            risk_score += 1

    completed_problem_count = len({submission.problem_id for submission in candidate.submissions})

    return {
        "id": candidate.id,
        "email": candidate.email,
        "token": candidate.token,
        "status": candidate.status,
        "started_at": candidate.started_at,
        "submitted_at": candidate.submitted_at,
        "last_seen_at": candidate.last_seen_at,
        "submission_count": len(candidate.submissions),
        "log_count": len(candidate.activity_logs),
        "completed_problem_count": completed_problem_count,
        "risk_score": risk_score,
    }


@router.get("/", response_model=list[InterviewOut])
def list_interviews(db: Session = Depends(get_db), user=Depends(require_recruiter)):
    query = db.query(Interview).order_by(Interview.created_at.desc(), Interview.id.desc())
    if not (getattr(user, "is_admin", False) or getattr(user, "role", "user") == "admin"):
        query = query.filter(Interview.recruiter_id == user.id)
    return query.all()


@router.get("/{interview_id}", response_model=InterviewDetailOut)
def get_interview(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = _load_interview_detail(db, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    _ensure_owner_or_admin(interview, user)
    return _serialize_interview(interview)


@router.post("/", response_model=InterviewDetailOut)
def create_interview(data: InterviewIn, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = Interview(
        title=data.title,
        description=data.description,
        difficulty=data.difficulty,
        duration_minutes=data.duration_minutes,
        availability_days=data.availability_days,
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
    _ensure_owner(interview, user)
    interview.title = data.title
    interview.description = data.description
    interview.difficulty = data.difficulty
    interview.duration_minutes = data.duration_minutes
    interview.availability_days = data.availability_days
    interview.settings = data.settings or {}
    interview.status = data.status
    replace_interview_problems(db, interview, data.problems)
    db.commit()
    interview = _load_interview_detail(db, interview_id)
    return _serialize_interview(interview)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    _ensure_owner(interview, user)
    db.delete(interview)
    db.commit()


@router.post("/{interview_id}/candidates", response_model=InterviewCandidateBatchOut)
def add_candidates(
    interview_id: int,
    data: InterviewCandidateBatchIn,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    existing = {candidate.email.lower(): candidate for candidate in interview.candidates}
    normalized_emails: list[str] = []
    duplicate_emails: list[str] = []

    for email in data.emails:
        normalized = (email or "").strip().lower()
        if not normalized:
            continue
        if normalized in existing or normalized in normalized_emails:
            duplicate_emails.append(normalized)
            continue

        normalized_emails.append(normalized)

    if duplicate_emails:
        duplicates = sorted(set(duplicate_emails))
        noun = "Candidate" if len(duplicates) == 1 else "Candidates"
        verb = "already exists" if len(duplicates) == 1 else "already exist"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{noun} {verb} for this interview: {', '.join(duplicates)}",
        )

    created = []
    for normalized in normalized_emails:
        candidate = InterviewCandidate(
            interview_id=interview.id,
            email=normalized,
            token=generate_candidate_token(),
        )
        db.add(candidate)
        created.append(candidate)
    db.flush()
    invite_results = [send_candidate_invite(db, item) for item in created]
    db.commit()
    for item in created:
        db.refresh(item)
    return {"candidates": created, "invite_results": invite_results}


@router.post("/{interview_id}/candidates/{candidate_id}/resend-invite", response_model=InterviewResendInviteOut)
def resend_candidate_invite(
    interview_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    candidate = (
        db.query(InterviewCandidate)
        .options(joinedload(InterviewCandidate.interview))
        .filter(
            InterviewCandidate.id == candidate_id,
            InterviewCandidate.interview_id == interview_id,
        )
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    invite = send_candidate_invite(db, candidate, enforce_resend_cooldown=True)
    db.commit()
    db.refresh(candidate)
    return {"candidate": candidate, "invite": invite}


@router.get("/{interview_id}/candidates", response_model=InterviewCandidatesPageOut)
def list_candidates(
    interview_id: int,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = db.query(Interview).options(joinedload(Interview.candidates)).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    _ensure_owner_or_admin(interview, user)
    query = db.query(InterviewCandidate).filter(InterviewCandidate.interview_id == interview_id)
    if status:
        query = query.filter(InterviewCandidate.status == status)
    if search:
        query = query.filter(InterviewCandidate.email.ilike(f"%{search}%"))
    total = query.count()
    items = (
        query.order_by(InterviewCandidate.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.patch("/{interview_id}/candidates/{candidate_id}/status", response_model=InterviewCandidateOut)
def update_candidate_status(
    interview_id: int,
    candidate_id: int,
    payload: InterviewCandidateStatusUpdateIn,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    candidate = (
        db.query(InterviewCandidate)
        .filter(
            InterviewCandidate.id == candidate_id,
            InterviewCandidate.interview_id == interview_id,
        )
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    next_status = (payload.status or "").strip().lower()
    if next_status not in ALLOWED_CANDIDATE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid candidate status")

    candidate.status = next_status
    if next_status == "pending":
        candidate.started_at = None
        candidate.submitted_at = None
    elif next_status == "started":
        if not candidate.started_at:
            candidate.started_at = candidate.created_at
        candidate.submitted_at = None
    else:
        if not candidate.started_at:
            candidate.started_at = candidate.created_at
        if not candidate.submitted_at:
            candidate.submitted_at = candidate.started_at
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/{interview_id}/candidates/{candidate_id}", response_model=InterviewCandidateReviewOut)
def get_candidate_review(
    interview_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    candidate = _load_candidate_or_404(db, interview_id, candidate_id)
    return _serialize_candidate_review(candidate)


@router.get("/{interview_id}/candidates/{candidate_id}/submissions", response_model=list[InterviewSubmissionOut])
def list_candidate_submissions(
    interview_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    candidate = _load_candidate_or_404(db, interview_id, candidate_id)
    rows = sorted(candidate.submissions, key=lambda row: ((row.updated_at or row.created_at), row.id), reverse=True)
    return [
        {
            "id": row.id,
            "candidate_id": row.candidate_id,
            "candidate_email": candidate.email,
            "problem_id": row.problem_id,
            "language": row.language,
            "code": row.code,
            "change_summary": row.change_summary,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]


@router.get("/{interview_id}/candidates/{candidate_id}/logs", response_model=list[InterviewActivityLogOut])
def list_candidate_logs(
    interview_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    interview = load_interview_or_404(db, interview_id)
    _ensure_owner_or_admin(interview, user)
    candidate = _load_candidate_or_404(db, interview_id, candidate_id)
    rows = sorted(candidate.activity_logs, key=lambda row: (row.timestamp, row.id), reverse=True)
    return [
        {
            "id": row.id,
            "candidate_id": row.candidate_id,
            "candidate_email": candidate.email,
            "event_type": row.event_type,
            "meta": row.meta,
            "timestamp": row.timestamp,
        }
        for row in rows
    ]


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
            "change_summary": row.change_summary,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
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
