import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.controllers.auth import get_current_user
from app.models import Problem, Submission, User
from app.services.auth import decode_access_token
from app.services.piston import execute_test_cases, summarize_results
from database import get_db
from schemas import SubmissionListItem, SubmissionRequest, SubmissionSummary

router = APIRouter()


def _load_problem(db: Session, problem_id: int) -> Problem:
    problem = db.query(Problem).get(problem_id)
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


def _serialize_cases(results, include_io: bool, only_sample: bool):
    cases = []
    for result in results:
        if only_sample and not result.get("is_sample"):
            continue
        case = {
            "id": result.get("id"),
            "is_sample": result.get("is_sample", True),
            "stdout": result.get("stdout"),
            "stderr": result.get("stderr"),
            "compile_output": result.get("compile_output"),
            "status": result.get("status"),
            "time": result.get("time"),
            "memory": result.get("memory"),
            "passed": result.get("passed"),
        }
        if include_io:
            case["input_text"] = result.get("input_text")
            case["output_text"] = result.get("output_text")
        cases.append(case)
    return cases


def _normalize_language(value: str) -> str:
    return (value or "").strip().lower()


def _guard_language_mismatch(language: str, code: str) -> None:
    js_like = re.search(r"\bfunction\b|=>|\bconsole\.log\b|\b(let|const|var)\b", code, re.IGNORECASE)
    py_like = re.search(r"\bdef\b|\bprint\(|\bimport\b", code, re.IGNORECASE)
    if language == "python" and js_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your code looks like JavaScript, but Python is selected.",
        )
    if language == "javascript" and py_like:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your code looks like Python, but JavaScript is selected.",
        )

def _get_user_from_request(request: Request, db: Session) -> User | None:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    payload = decode_access_token(parts[1])
    if not payload or type(payload) is not dict:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return None
    return db.query(User).filter(User.id == user_id_int).first()


@router.post("/run", response_model=SubmissionSummary)
def run_submission(payload: SubmissionRequest, request: Request, db: Session = Depends(get_db)):
    try:
        problem = _load_problem(db, payload.problem_id)
        sample_cases = [tc for tc in problem.test_cases if tc.is_sample]
        if not sample_cases:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No sample test cases available")

        language = _normalize_language(payload.language)
        _guard_language_mismatch(language, payload.code)
        results = execute_test_cases(
            language=language,
            source_code=payload.code,
            test_cases=[
                {
                    "id": tc.id,
                    "input_text": tc.input_text,
                    "output_text": tc.output_text,
                    "is_sample": tc.is_sample,
                }
                for tc in sorted(sample_cases, key=lambda t: t.order)
            ],
        )
        summary = summarize_results(results)
        return {
            "verdict": summary["verdict"],
            "passed": summary["passed"],
            "total": summary["total"],
            "cases": _serialize_cases(results, include_io=True, only_sample=True),
            "hidden": None,
        }
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

        problem = _load_problem(db, payload.problem_id)
        all_cases = sorted(problem.test_cases, key=lambda t: t.order)
        if not all_cases:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No test cases available")

        language = _normalize_language(payload.language)
        _guard_language_mismatch(language, payload.code)
        results = execute_test_cases(
            language=language,
            source_code=payload.code,
            test_cases=[
                {
                    "id": tc.id,
                    "input_text": tc.input_text,
                    "output_text": tc.output_text,
                    "is_sample": tc.is_sample,
                }
                for tc in all_cases
            ],
        )

        summary = summarize_results(results)
        hidden_total = len([r for r in results if not r.get("is_sample")])
        hidden_passed = len([r for r in results if not r.get("is_sample") and r.get("passed")])

        submission = Submission(
            user_id=user.id,
            problem_id=payload.problem_id,
            language=language,
            code=payload.code,
            verdict=summary["verdict"],
            passed=summary["passed"],
            total=summary["total"],
            is_submit=True,
            status=summary["verdict"],
        )
        db.add(submission)
        db.commit()

        return {
            "verdict": summary["verdict"],
            "passed": summary["passed"],
            "total": summary["total"],
            "cases": _serialize_cases(results, include_io=True, only_sample=True),
            "hidden": {"passed": hidden_passed, "total": hidden_total},
        }
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

    rows = (
        db.query(Submission)
        .filter(Submission.user_id == user.id, Submission.problem_id == problem_id)
        .order_by(Submission.created_at.desc())
        .all()
    )
    return rows
