from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Interview, InterviewActivityLog, InterviewCandidate, InterviewMediaSegment, InterviewProblem, InterviewSubmission
from app.services.interview import generate_candidate_token, load_interview_or_404, replace_interview_problems, send_candidate_invite
from config import settings


ALLOWED_CANDIDATE_STATUSES = {"pending", "started", "submitted", "expired"}


def _candidate_upload_dir(candidate: InterviewCandidate) -> Path:
    return Path(settings.INTERVIEW_MEDIA_UPLOAD_ROOT) / f"interview_{candidate.interview_id}" / f"candidate_{candidate.id}"


def _reset_candidate_interview_data(db: Session, candidate: InterviewCandidate) -> None:
    segment_paths = [
        Path(path)
        for (path,) in db.query(InterviewMediaSegment.storage_path)
        .filter(InterviewMediaSegment.candidate_id == candidate.id)
        .all()
        if path
    ]

    db.query(InterviewSubmission).filter(InterviewSubmission.candidate_id == candidate.id).delete(synchronize_session=False)
    db.query(InterviewActivityLog).filter(InterviewActivityLog.candidate_id == candidate.id).delete(synchronize_session=False)
    db.query(InterviewMediaSegment).filter(InterviewMediaSegment.candidate_id == candidate.id).delete(synchronize_session=False)

    for path in segment_paths:
        try:
            if path.exists():
                path.unlink()
        except OSError:
            pass

    candidate_dir = _candidate_upload_dir(candidate)
    try:
        if candidate_dir.exists() and not any(candidate_dir.iterdir()):
            candidate_dir.rmdir()
        interview_dir = candidate_dir.parent
        if interview_dir.exists() and not any(interview_dir.iterdir()):
            interview_dir.rmdir()
    except OSError:
        pass


def load_interview_detail(db: Session, interview_id: int) -> Interview | None:
    return (
        db.query(Interview)
        .options(joinedload(Interview.interview_problems).joinedload(InterviewProblem.problem))
        .filter(Interview.id == interview_id)
        .first()
    )


def ensure_owner_or_admin(interview: Interview, user) -> None:
    if getattr(user, "is_admin", False) or getattr(user, "role", "user") == "admin":
        return
    if interview.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def ensure_owner(interview: Interview, user) -> None:
    if interview.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only interview owner can perform this action")


def serialize_interview(interview: Interview) -> dict:
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


def load_candidate_or_404(db: Session, interview_id: int, candidate_id: int) -> InterviewCandidate:
    candidate = (
        db.query(InterviewCandidate)
        .options(
            joinedload(InterviewCandidate.interview).joinedload(Interview.interview_problems),
            joinedload(InterviewCandidate.submissions),
            joinedload(InterviewCandidate.activity_logs),
            joinedload(InterviewCandidate.media_segments),
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


def serialize_candidate_review(candidate: InterviewCandidate) -> dict:
    risk_score = 0
    for log in candidate.activity_logs:
        if log.event_type in {"tab_hidden", "window_blur"}:
            risk_score += 3
        elif log.event_type in {"copy", "paste", "media_permission_denied", "media_capture_stopped", "media_upload_failed"}:
            risk_score += 2
        else:
            risk_score += 1

    completed_problem_count = len({submission.problem_id for submission in candidate.submissions})
    return {
        "id": candidate.id,
        "email": candidate.email,
        "token": candidate.token,
        "status": candidate.status,
        "invite_status": candidate.invite_status,
        "invite_error": candidate.invite_error,
        "invite_sent_at": candidate.invite_sent_at,
        "invite_attempts": candidate.invite_attempts,
        "started_at": candidate.started_at,
        "submitted_at": candidate.submitted_at,
        "last_seen_at": candidate.last_seen_at,
        "submission_count": len(candidate.submissions),
        "log_count": len(candidate.activity_logs),
        "completed_problem_count": completed_problem_count,
        "risk_score": risk_score,
    }


def list_interviews_for_user(db: Session, user) -> list[Interview]:
    query = db.query(Interview).order_by(Interview.created_at.desc(), Interview.id.desc())
    if not (getattr(user, "is_admin", False) or getattr(user, "role", "user") == "admin"):
        query = query.filter(Interview.recruiter_id == user.id)
    return query.all()


def get_interview_for_user(db: Session, interview_id: int, user) -> dict:
    interview = load_interview_detail(db, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    ensure_owner_or_admin(interview, user)
    return serialize_interview(interview)


def create_interview_for_user(db: Session, user, data) -> dict:
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
    return get_interview_for_user(db, interview.id, user)


def update_interview_for_user(db: Session, interview_id: int, user, data) -> dict:
    interview = load_interview_detail(db, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    ensure_owner(interview, user)
    interview.title = data.title
    interview.description = data.description
    interview.difficulty = data.difficulty
    interview.duration_minutes = data.duration_minutes
    interview.availability_days = data.availability_days
    interview.settings = data.settings or {}
    interview.status = data.status
    replace_interview_problems(db, interview, data.problems)
    db.commit()
    return get_interview_for_user(db, interview_id, user)


def delete_interview_for_user(db: Session, interview_id: int, user) -> None:
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    ensure_owner(interview, user)
    db.delete(interview)
    db.commit()


def add_interview_candidates(db: Session, interview_id: int, user, emails: list[str]) -> dict:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
    existing = {candidate.email.lower(): candidate for candidate in interview.candidates}
    normalized_emails: list[str] = []
    duplicate_emails: list[str] = []
    for email in emails:
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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{noun} {verb} for this interview: {', '.join(duplicates)}")

    created = []
    for normalized in normalized_emails:
        candidate = InterviewCandidate(interview_id=interview.id, email=normalized, token=generate_candidate_token())
        db.add(candidate)
        created.append(candidate)
    db.flush()
    invite_results = [send_candidate_invite(db, item) for item in created]
    db.commit()
    for item in created:
        db.refresh(item)
    return {"candidates": created, "invite_results": invite_results}


def resend_interview_candidate_invite(db: Session, interview_id: int, candidate_id: int, user) -> dict:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
    candidate = (
        db.query(InterviewCandidate)
        .options(joinedload(InterviewCandidate.interview))
        .filter(InterviewCandidate.id == candidate_id, InterviewCandidate.interview_id == interview_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    invite = send_candidate_invite(db, candidate, enforce_resend_cooldown=True)
    db.commit()
    db.refresh(candidate)
    return {"candidate": candidate, "invite": invite}


def list_interview_candidates(db: Session, interview_id: int, user, page: int, page_size: int, status_value: str | None, search: str | None) -> dict:
    interview = db.query(Interview).options(joinedload(Interview.candidates)).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    ensure_owner_or_admin(interview, user)
    query = db.query(InterviewCandidate).filter(InterviewCandidate.interview_id == interview_id)
    if status_value:
        query = query.filter(InterviewCandidate.status == status_value)
    if search:
        query = query.filter(InterviewCandidate.email.ilike(f"%{search}%"))
    total = query.count()
    items = query.order_by(InterviewCandidate.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def update_interview_candidate_status(db: Session, interview_id: int, candidate_id: int, user, status_value: str) -> InterviewCandidate:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
    candidate = (
        db.query(InterviewCandidate)
        .filter(InterviewCandidate.id == candidate_id, InterviewCandidate.interview_id == interview_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    next_status = (status_value or "").strip().lower()
    if next_status not in ALLOWED_CANDIDATE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid candidate status")
    current_status = candidate.status
    if next_status == "pending" and current_status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted candidates can be reset to pending",
        )
    if current_status == "expired" and next_status != "expired":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expired candidates cannot be reopened from the status control",
        )

    candidate.status = next_status
    if next_status == "pending":
        _reset_candidate_interview_data(db, candidate)
        candidate.token = generate_candidate_token()
        candidate.invite_status = "pending"
        candidate.invite_error = None
        candidate.invite_sent_at = None
        candidate.started_at = None
        candidate.submitted_at = None
        candidate.last_seen_at = None
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


def get_candidate_review_for_recruiter(db: Session, interview_id: int, candidate_id: int, user) -> dict:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
    candidate = load_candidate_or_404(db, interview_id, candidate_id)
    return serialize_candidate_review(candidate)


def list_candidate_submissions_for_recruiter(db: Session, interview_id: int, candidate_id: int, user) -> list[dict]:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
    candidate = load_candidate_or_404(db, interview_id, candidate_id)
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


def list_candidate_logs_for_recruiter(db: Session, interview_id: int, candidate_id: int, user) -> list[dict]:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
    candidate = load_candidate_or_404(db, interview_id, candidate_id)
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


def list_interview_submissions_for_recruiter(db: Session, interview_id: int, user) -> list[dict]:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
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


def list_interview_logs_for_recruiter(db: Session, interview_id: int, user) -> list[dict]:
    interview = load_interview_or_404(db, interview_id)
    ensure_owner_or_admin(interview, user)
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
