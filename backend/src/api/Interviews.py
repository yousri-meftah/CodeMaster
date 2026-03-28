from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.auth import require_recruiter
from app.controllers.interview_media import list_candidate_media_for_recruiter, stream_candidate_media_segment
from app.controllers.interviews import (
    add_interview_candidates,
    create_interview_for_user,
    delete_interview_for_user,
    get_candidate_review_for_recruiter,
    get_interview_for_user,
    list_candidate_logs_for_recruiter,
    list_candidate_submissions_for_recruiter,
    list_interview_candidates,
    list_interview_logs_for_recruiter,
    list_interview_submissions_for_recruiter,
    list_interviews_for_user,
    resend_interview_candidate_invite,
    update_interview_candidate_status,
    update_interview_for_user,
)
from database import get_db
from schemas import (
    InterviewActivityLogOut,
    InterviewCandidateBatchIn,
    InterviewCandidateBatchOut,
    InterviewCandidateOut,
    InterviewCandidateReviewOut,
    InterviewCandidateStatusUpdateIn,
    InterviewCandidatesPageOut,
    InterviewDetailOut,
    InterviewIn,
    InterviewMediaSegmentOut,
    InterviewOut,
    InterviewResendInviteOut,
    InterviewSubmissionOut,
)

router = APIRouter()


@router.get("/", response_model=list[InterviewOut])
def list_interviews(db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return list_interviews_for_user(db, user)


@router.get("/{interview_id}", response_model=InterviewDetailOut)
def get_interview(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return get_interview_for_user(db, interview_id, user)


@router.post("/", response_model=InterviewDetailOut)
def create_interview(data: InterviewIn, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return create_interview_for_user(db, user, data)


@router.put("/{interview_id}", response_model=InterviewDetailOut)
def update_interview(interview_id: int, data: InterviewIn, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return update_interview_for_user(db, interview_id, user, data)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    delete_interview_for_user(db, interview_id, user)


@router.post("/{interview_id}/candidates", response_model=InterviewCandidateBatchOut)
def add_candidates(interview_id: int, data: InterviewCandidateBatchIn, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    try:
        return add_interview_candidates(db, interview_id, user, data.emails)
    except HTTPException:
        raise


@router.post("/{interview_id}/candidates/{candidate_id}/resend-invite", response_model=InterviewResendInviteOut)
def resend_candidate_invite(interview_id: int, candidate_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return resend_interview_candidate_invite(db, interview_id, candidate_id, user)


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
    return list_interview_candidates(db, interview_id, user, page, page_size, status, search)


@router.patch("/{interview_id}/candidates/{candidate_id}/status", response_model=InterviewCandidateOut)
def update_candidate_status(
    interview_id: int,
    candidate_id: int,
    payload: InterviewCandidateStatusUpdateIn,
    db: Session = Depends(get_db),
    user=Depends(require_recruiter),
):
    return update_interview_candidate_status(db, interview_id, candidate_id, user, payload.status)


@router.get("/{interview_id}/candidates/{candidate_id}", response_model=InterviewCandidateReviewOut)
def get_candidate_review(interview_id: int, candidate_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return get_candidate_review_for_recruiter(db, interview_id, candidate_id, user)


@router.get("/{interview_id}/candidates/{candidate_id}/submissions", response_model=list[InterviewSubmissionOut])
def list_candidate_submissions(interview_id: int, candidate_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return list_candidate_submissions_for_recruiter(db, interview_id, candidate_id, user)


@router.get("/{interview_id}/candidates/{candidate_id}/logs", response_model=list[InterviewActivityLogOut])
def list_candidate_logs(interview_id: int, candidate_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return list_candidate_logs_for_recruiter(db, interview_id, candidate_id, user)


@router.get("/{interview_id}/candidates/{candidate_id}/media", response_model=list[InterviewMediaSegmentOut])
def list_candidate_media(interview_id: int, candidate_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return list_candidate_media_for_recruiter(db=db, interview_id=interview_id, candidate_id=candidate_id, user=user)


@router.get("/{interview_id}/candidates/{candidate_id}/media/{segment_id}")
def get_candidate_media_segment(interview_id: int, candidate_id: int, segment_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return stream_candidate_media_segment(db=db, interview_id=interview_id, candidate_id=candidate_id, segment_id=segment_id, user=user)


@router.get("/{interview_id}/submissions", response_model=list[InterviewSubmissionOut])
def list_interview_submissions(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return list_interview_submissions_for_recruiter(db, interview_id, user)


@router.get("/{interview_id}/logs", response_model=list[InterviewActivityLogOut])
def list_interview_logs(interview_id: int, db: Session = Depends(get_db), user=Depends(require_recruiter)):
    return list_interview_logs_for_recruiter(db, interview_id, user)
