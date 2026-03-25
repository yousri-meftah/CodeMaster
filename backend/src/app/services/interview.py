import math
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

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
from app.services.mail import send_email
from config import settings


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


def build_candidate_link(token: str) -> str:
    base = settings.INTERVIEW_PUBLIC_BASE_URL.rstrip("/")
    query = urlencode({"token": token})
    return f"{base}/challenge?{query}"


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
    change_summary: dict | None = None,
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
        submission.change_summary = change_summary
    else:
        submission = InterviewSubmission(
            candidate_id=candidate.id,
            problem_id=problem_id,
            language=language,
            code=code,
            change_summary=change_summary,
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


def _invite_text_body(*, interview_title: str, interview_link: str) -> str:
    return (
        "Hello,\n\n"
        f"You have been invited to interview: {interview_title}\n\n"
        "Use the link below to access your interview:\n"
        f"{interview_link}\n\n"
        "Please open the link before it expires.\n\n"
        "Good luck,\nCodeMaster Team\n"
    )


def _invite_html_body(*, interview_title: str, interview_link: str) -> str:
    return f"""\
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Interview Invitation</title>
    <style>
      body {{
        margin: 0;
        background: #f1f5f9;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #0f172a;
      }}
      .wrapper {{
        width: 100%;
        padding: 24px 12px;
      }}
      .card {{
        max-width: 620px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }}
      .header {{
        background: linear-gradient(135deg, #0f172a, #1d4ed8);
        color: #ffffff;
        padding: 28px 24px;
      }}
      .header h1 {{
        margin: 0;
        font-size: 20px;
        letter-spacing: 0.2px;
      }}
      .content {{
        padding: 24px;
        font-size: 15px;
        line-height: 1.6;
      }}
      .title {{
        margin: 8px 0 16px 0;
        font-size: 18px;
        font-weight: 700;
      }}
      .cta {{
        margin: 24px 0;
      }}
      .btn {{
        display: inline-block;
        text-decoration: none;
        background: #2563eb;
        color: #ffffff !important;
        padding: 12px 18px;
        border-radius: 10px;
        font-weight: 600;
      }}
      .hint {{
        margin-top: 14px;
        padding: 12px;
        border: 1px dashed #cbd5e1;
        border-radius: 10px;
        background: #f8fafc;
        font-size: 13px;
        color: #334155;
        word-break: break-all;
      }}
      .footer {{
        padding: 16px 24px 24px 24px;
        font-size: 12px;
        color: #64748b;
      }}
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="header">
          <h1>CodeMaster Interview Invitation</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been invited to complete an interview challenge.</p>
          <p class="title">{interview_title}</p>
          <p>Please use the secure link below to start your interview.</p>
          <div class="cta">
            <a class="btn" href="{interview_link}" target="_blank" rel="noopener noreferrer">Start Interview</a>
          </div>
          <div class="hint">
            If the button does not work, copy and paste this URL in your browser:<br />
            {interview_link}
          </div>
        </div>
        <div class="footer">
          This is an automated message from CodeMaster. Please do not reply to this email.
        </div>
      </div>
    </div>
  </body>
</html>
"""


def _resend_retry_after_seconds(candidate: InterviewCandidate) -> int:
    if candidate.invite_status != "sent":
        return 0
    sent_at = _ensure_aware(candidate.invite_sent_at)
    if sent_at is None:
        return 0
    cooldown = timedelta(minutes=settings.INTERVIEW_INVITE_RESEND_COOLDOWN_MINUTES)
    next_allowed_at = sent_at + cooldown
    remaining = (next_allowed_at - _utcnow()).total_seconds()
    return max(0, int(math.ceil(remaining)))


def send_candidate_invite(
    db: Session,
    candidate: InterviewCandidate,
    *,
    enforce_resend_cooldown: bool = False,
) -> dict:
    if enforce_resend_cooldown:
        retry_after = _resend_retry_after_seconds(candidate)
        if retry_after > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Invite already sent recently. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

    candidate.invite_attempts = (candidate.invite_attempts or 0) + 1
    interview_link = build_candidate_link(candidate.token)
    recruiter = getattr(candidate.interview, "recruiter", None)
    owner_email = (getattr(recruiter, "email", "") or "").strip() or settings.MAIL_FROM
    owner_name = (getattr(recruiter, "name", "") or "").strip() or settings.MAIL_FROM_NAME
    try:
        send_email(
            to_email=candidate.email,
            subject=f"Interview Invitation: {candidate.interview.title}",
            text_body=_invite_text_body(interview_title=candidate.interview.title, interview_link=interview_link),
            html_body=_invite_html_body(interview_title=candidate.interview.title, interview_link=interview_link),
            from_email=owner_email,
            from_name=owner_name,
        )
        candidate.invite_status = "sent"
        candidate.invite_error = None
        candidate.invite_sent_at = _utcnow()
    except Exception as exc:
        candidate.invite_status = "failed"
        candidate.invite_error = str(exc)
    db.flush()
    return {
        "candidate_id": candidate.id,
        "email": candidate.email,
        "status": candidate.invite_status,
        "error": candidate.invite_error,
    }
