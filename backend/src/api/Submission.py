from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.auth import get_current_user
from app.controllers.submission import (
    list_user_problem_submissions,
    run_problem_submission,
    submit_problem_solution,
)
from database import get_db
from schemas import SubmissionListItem, SubmissionRequest, SubmissionSummary

router = APIRouter()


@router.post("/run", response_model=SubmissionSummary)
def run_submission(payload: SubmissionRequest, db: Session = Depends(get_db)):
    try:
        return run_problem_submission(
            db=db,
            problem_id=payload.problem_id,
            language=payload.language,
            code=payload.code,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.post("/submit", response_model=SubmissionSummary)
def submit_submission(
    payload: SubmissionRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        return submit_problem_solution(
            db=db,
            user_id=user.id,
            problem_id=payload.problem_id,
            language=payload.language,
            code=payload.code,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/problem/{problem_id}", response_model=list[SubmissionListItem])
def list_problem_submissions(
    problem_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return list_user_problem_submissions(db=db, user_id=user.id, problem_id=problem_id)
