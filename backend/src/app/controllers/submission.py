from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Problem, Submission
from app.services.piston import execute_test_cases, summarize_results


def load_problem(db: Session, problem_id: int) -> Problem:
    problem = db.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")
    return problem


def normalize_language(value: str) -> str:
    return (value or "").strip().lower()


def serialize_cases(results, include_io: bool, only_sample: bool):
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


def run_problem_submission(db: Session, problem_id: int, language: str, code: str):
    problem = load_problem(db, problem_id)
    sample_cases = [tc for tc in problem.test_cases if tc.is_sample]
    if not sample_cases:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No sample test cases available")

    normalized_language = normalize_language(language)
    results = execute_test_cases(
        language=normalized_language,
        source_code=code,
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
    response = {
        "verdict": summary["verdict"],
        "passed": summary["passed"],
        "total": summary["total"],
        "cases": serialize_cases(results, include_io=True, only_sample=True),
        "hidden": None,
    }
    if normalized_language == "algo":
        response["algo_outputs"] = [
            {"id": r.get("id"), "stdout": r.get("stdout"), "stderr": r.get("stderr")}
            for r in results
            if r.get("is_sample", True)
        ]
    return response


def submit_problem_solution(
    db: Session,
    user_id: int,
    problem_id: int,
    language: str,
    code: str,
):
    problem = load_problem(db, problem_id)
    all_cases = sorted(problem.test_cases, key=lambda t: t.order)
    if not all_cases:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No test cases available")

    normalized_language = normalize_language(language)
    results = execute_test_cases(
        language=normalized_language,
        source_code=code,
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
        user_id=user_id,
        problem_id=problem_id,
        language=normalized_language,
        code=code,
        verdict=summary["verdict"],
        passed=summary["passed"],
        total=summary["total"],
        is_submit=True,
        status=summary["verdict"],
    )
    db.add(submission)
    db.commit()

    response = {
        "verdict": summary["verdict"],
        "passed": summary["passed"],
        "total": summary["total"],
        "cases": serialize_cases(results, include_io=True, only_sample=True),
        "hidden": {"passed": hidden_passed, "total": hidden_total},
    }
    if normalized_language == "algo":
        response["algo_outputs"] = [
            {"id": r.get("id"), "stdout": r.get("stdout"), "stderr": r.get("stderr")}
            for r in results
            if r.get("is_sample", True)
        ]
    return response


def list_user_problem_submissions(db: Session, user_id: int, problem_id: int):
    return (
        db.query(Submission)
        .filter(Submission.user_id == user_id, Submission.problem_id == problem_id)
        .order_by(Submission.created_at.desc())
        .all()
    )
