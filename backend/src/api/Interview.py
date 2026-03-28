from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.controllers.interview_media import finalize_candidate_media, get_candidate_media_status, upload_candidate_media_segment
from app.controllers.interview_session import (
    get_candidate_session,
    log_candidate_event,
    save_candidate_interview_code,
    start_candidate_session,
    submit_candidate_session,
)
from database import get_db
from schemas import (
    CandidateSessionOut,
    InterviewCandidateOut,
    InterviewLogIn,
    InterviewMediaFinalizeIn,
    InterviewMediaSegmentOut,
    InterviewMediaSegmentStatusOut,
    InterviewSaveIn,
    InterviewSubmitIn,
)

router = APIRouter()


@router.get("/session", response_model=CandidateSessionOut)
def get_session(token: str, db: Session = Depends(get_db)):
    try:
        return get_candidate_session(db=db, token=token)
    except HTTPException:
        raise


@router.post("/start", response_model=CandidateSessionOut)
def start_session(token: str, db: Session = Depends(get_db)):
    try:
        return start_candidate_session(db=db, token=token)
    except HTTPException:
        raise


@router.post("/save", response_model=InterviewCandidateOut)
def save_interview_code(payload: InterviewSaveIn, db: Session = Depends(get_db)):
    try:
        return save_candidate_interview_code(
            db=db,
            token=payload.token,
            problem_id=payload.problem_id,
            language=payload.language,
            code=payload.code,
            change_summary=payload.change_summary,
        )
    except HTTPException:
        raise


@router.post("/submit", response_model=InterviewCandidateOut)
def submit_interview(payload: InterviewSubmitIn, db: Session = Depends(get_db)):
    try:
        return submit_candidate_session(db=db, token=payload.token)
    except HTTPException:
        raise


@router.post("/log", response_model=InterviewCandidateOut)
def log_interview_event(payload: InterviewLogIn, db: Session = Depends(get_db)):
    try:
        return log_candidate_event(db=db, token=payload.token, event_type=payload.event_type, meta=payload.meta)
    except HTTPException:
        raise


@router.post("/media/segments", response_model=InterviewMediaSegmentOut)
def upload_media_segment(
    token: str = Form(...),
    media_kind: str = Form(...),
    sequence_number: int = Form(...),
    mime_type: str = Form(...),
    started_at: str | None = Form(None),
    ended_at: str | None = Form(None),
    duration_ms: int | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        return upload_candidate_media_segment(
            db=db,
            token=token,
            media_kind=media_kind,
            sequence_number=sequence_number,
            mime_type=mime_type,
            started_at=started_at,
            ended_at=ended_at,
            duration_ms=duration_ms,
            file=file,
        )
    except HTTPException:
        raise


@router.get("/media/status", response_model=InterviewMediaSegmentStatusOut)
def media_status(token: str, db: Session = Depends(get_db)):
    try:
        return get_candidate_media_status(db=db, token=token)
    except HTTPException:
        raise


@router.post("/media/finalize", response_model=InterviewMediaSegmentStatusOut)
def media_finalize(payload: InterviewMediaFinalizeIn, db: Session = Depends(get_db)):
    try:
        return finalize_candidate_media(db=db, token=payload.token)
    except HTTPException:
        raise
