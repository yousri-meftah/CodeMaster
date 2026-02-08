from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx

from database import get_db
from app.controllers.auth import get_current_user
from app.models import Submission
from config import settings
from schemas import ExecutionRequest, ExecutionResult, SubmissionOut

router = APIRouter()


@router.post("/execute", response_model=ExecutionResult)
async def execute_code(payload: ExecutionRequest):
    # Placeholder executor (accepts code + input and returns a stub response).
    return ExecutionResult(stdout="Execution received", status="ok")


async def forward_execute(payload: ExecutionRequest) -> ExecutionResult:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                settings.ALGO_EXECUTE_URL,
                json={"code": payload.code, "input": payload.input or "", "language": payload.language},
            )
            if res.status_code >= 400:
                raise HTTPException(status_code=res.status_code, detail=res.text)
            data = res.json()
            return ExecutionResult(
                stdout=data.get("stdout", ""),
                stderr=data.get("stderr"),
                status=data.get("status", "ok"),
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run", response_model=ExecutionResult)
async def run_code(payload: ExecutionRequest, db: Session = Depends(get_db)):
    result = await forward_execute(payload)
    submission = Submission(
        language=payload.language,
        code=payload.code,
        input_text=payload.input or "",
        output_text=result.stdout,
        status=result.status,
        is_submit=False,
    )
    db.add(submission)
    db.commit()
    return result


@router.post("/submit", response_model=SubmissionOut)
async def submit_code(
    payload: ExecutionRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    result = await forward_execute(payload)
    submission = Submission(
        user_id=user.id,
        language=payload.language,
        code=payload.code,
        input_text=payload.input or "",
        output_text=result.stdout,
        status=result.status,
        is_submit=True,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return SubmissionOut(
        id=submission.id,
        status=submission.status,
        output_text=submission.output_text,
        created_at=submission.created_at,
    )
