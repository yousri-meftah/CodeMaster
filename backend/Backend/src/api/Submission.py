from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.auth import get_current_user
from app.models import Problem
from app.services.piston import execute_test_cases, summarize_results
from database import get_db
from schemas import SubmissionRequest, SubmissionSummary

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


@router.post("/run", response_model=SubmissionSummary)
def run_submission(payload: SubmissionRequest, db: Session = Depends(get_db)):
    try:
        problem = _load_problem(db, payload.problem_id)
        sample_cases = [tc for tc in problem.test_cases if tc.is_sample]
        if not sample_cases:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No sample test cases available")

        results = execute_test_cases(
            language=payload.language,
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
        print("results = ",results)
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

        results = execute_test_cases(
            language=payload.language,
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
