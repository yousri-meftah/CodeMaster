import hashlib
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.models import Interview, InterviewCandidate, InterviewMediaSegment
from app.services.interview import create_activity_log, get_candidate_by_token, load_interview_or_404, require_started_candidate
from config import settings


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid timestamp") from exc


def _candidate_upload_dir(candidate: InterviewCandidate) -> Path:
    return Path(settings.INTERVIEW_MEDIA_UPLOAD_ROOT) / f"interview_{candidate.interview_id}" / f"candidate_{candidate.id}"


def upload_candidate_media_segment(
    *,
    db: Session,
    token: str,
    media_kind: str,
    sequence_number: int,
    mime_type: str,
    started_at: str | None,
    ended_at: str | None,
    duration_ms: int | None,
    file: UploadFile,
) -> dict:
    candidate = require_started_candidate(db, token)
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing media filename")

    existing = (
        db.query(InterviewMediaSegment)
        .filter(
            InterviewMediaSegment.candidate_id == candidate.id,
            InterviewMediaSegment.sequence_number == sequence_number,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Media segment already uploaded")

    candidate_dir = _candidate_upload_dir(candidate)
    candidate_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename).suffix or ".bin"
    output_path = candidate_dir / f"{sequence_number:06d}_{media_kind}{suffix}"

    content = file.file.read()
    if not content:
        create_activity_log(db, candidate, "media_upload_empty", {"sequence_number": sequence_number, "media_kind": media_kind})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty media upload")

    output_path.write_bytes(content)
    checksum = hashlib.sha256(content).hexdigest()
    segment = InterviewMediaSegment(
        candidate_id=candidate.id,
        sequence_number=sequence_number,
        media_kind=media_kind,
        mime_type=mime_type or file.content_type or "application/octet-stream",
        storage_path=str(output_path),
        size_bytes=len(content),
        duration_ms=duration_ms,
        checksum=checksum,
        upload_status="uploaded",
        started_at=_parse_timestamp(started_at),
        ended_at=_parse_timestamp(ended_at),
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return _serialize_media_segment(segment, candidate_email=candidate.email, include_storage_path=False)


def get_candidate_media_status(*, db: Session, token: str) -> dict:
    candidate = get_candidate_by_token(db, token, allow_expired=True)
    rows = (
        db.query(InterviewMediaSegment)
        .filter(InterviewMediaSegment.candidate_id == candidate.id)
        .order_by(InterviewMediaSegment.sequence_number.asc())
        .all()
    )
    latest = rows[-1].sequence_number if rows else None
    return {
        "uploaded_segments": len(rows),
        "latest_sequence_number": latest,
        "statuses": [_serialize_media_segment(row, candidate_email=candidate.email, include_storage_path=False) for row in rows],
    }


def finalize_candidate_media(*, db: Session, token: str) -> dict:
    candidate = get_candidate_by_token(db, token, allow_expired=True)
    create_activity_log(db, candidate, "media_finalize", {"uploaded_segments": len(candidate.media_segments)})
    return get_candidate_media_status(db=db, token=token)


def list_candidate_media_for_recruiter(*, db: Session, interview_id: int, candidate_id: int, user) -> list[dict]:
    interview = load_interview_or_404(db, interview_id)
    if not (getattr(user, "is_admin", False) or getattr(user, "role", "user") == "admin") and interview.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    candidate = (
        db.query(InterviewCandidate)
        .options(joinedload(InterviewCandidate.media_segments))
        .filter(InterviewCandidate.id == candidate_id, InterviewCandidate.interview_id == interview_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    rows = sorted(candidate.media_segments, key=lambda row: (row.sequence_number, row.id))
    return [_serialize_media_segment(row, candidate_email=candidate.email, include_storage_path=False, interview_id=interview_id) for row in rows]


def stream_candidate_media_segment(*, db: Session, interview_id: int, candidate_id: int, segment_id: int, user) -> FileResponse:
    interview = load_interview_or_404(db, interview_id)
    if not (getattr(user, "is_admin", False) or getattr(user, "role", "user") == "admin") and interview.recruiter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    segment = (
        db.query(InterviewMediaSegment)
        .join(InterviewCandidate, InterviewCandidate.id == InterviewMediaSegment.candidate_id)
        .filter(
            InterviewMediaSegment.id == segment_id,
            InterviewMediaSegment.candidate_id == candidate_id,
            InterviewCandidate.interview_id == interview_id,
        )
        .first()
    )
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media segment not found")
    path = Path(segment.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored media file missing")
    return FileResponse(path, media_type=segment.mime_type, filename=path.name)


def _serialize_media_segment(
    segment: InterviewMediaSegment,
    *,
    candidate_email: str | None,
    include_storage_path: bool,
    interview_id: int | None = None,
) -> dict:
    return {
        "id": segment.id,
        "candidate_id": segment.candidate_id,
        "candidate_email": candidate_email,
        "sequence_number": segment.sequence_number,
        "media_kind": segment.media_kind,
        "mime_type": segment.mime_type,
        "storage_path": segment.storage_path if include_storage_path else None,
        "size_bytes": segment.size_bytes,
        "duration_ms": segment.duration_ms,
        "checksum": segment.checksum,
        "upload_status": segment.upload_status,
        "started_at": segment.started_at,
        "ended_at": segment.ended_at,
        "created_at": segment.created_at,
        "download_url": f"/interviews/{interview_id}/candidates/{segment.candidate_id}/media/{segment.id}" if interview_id else None,
    }
