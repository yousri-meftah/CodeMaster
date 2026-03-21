from datetime import datetime, timedelta

from app.models import InterviewCandidate, InterviewSubmission, User
from tests.test_auth import _login_user, _register_user


def _set_role(db_session, email: str, role: str, is_admin: bool = False):
    user = db_session.query(User).filter(User.email == email).first()
    user.role = role
    user.is_admin = is_admin
    db_session.commit()


def _auth_headers(client, email: str):
    login = _login_user(client, email=email)
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_recruiter(client, db_session, email="recruiter@example.com"):
    _register_user(client, email=email)
    _set_role(db_session, email, "recruiter")
    return _auth_headers(client, email)


def _create_admin(client, db_session, email="admin-interview@example.com"):
    _register_user(client, email=email)
    _set_role(db_session, email, "admin", is_admin=True)
    return _auth_headers(client, email)


def _create_plain_user(client, email="user-interview@example.com"):
    _register_user(client, email=email)
    return _auth_headers(client, email)


def _create_problem(client, headers, suffix="1"):
    tag_resp = client.post("/tag/", json={"name": f"graphs-{suffix}"}, headers=headers)
    tag_id = tag_resp.json()["id"]
    payload = {
        "title": f"Interview Problem {suffix}",
        "difficulty": "Medium",
        "external_link": None,
        "description": "Solve it.",
        "constraints": "Keep it linear.",
        "tag_ids": [tag_id],
        "test_cases": [
            {"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0},
        ],
    }
    create_resp = client.post("/problem/", json=payload, headers=headers)
    return create_resp.json()["id"]


def _create_interview(client, headers, problem_ids):
    payload = {
        "title": "Backend Screening",
        "description": "Timed interview",
        "difficulty": "Medium",
        "duration_minutes": 45,
        "settings": {"anti_cheat": True, "navigation": "restricted"},
        "status": "active",
        "problems": [
            {"problem_id": problem_id, "order": index}
            for index, problem_id in enumerate(problem_ids)
        ],
    }
    return client.post("/interviews/", json=payload, headers=headers)


def test_interview_routes_require_recruiter_or_admin(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session)
    admin_headers = _create_admin(client, db_session)
    user_headers = _create_plain_user(client)
    problem_id = _create_problem(client, admin_headers)

    forbidden = _create_interview(client, user_headers, [problem_id])
    assert forbidden.status_code == 403

    recruiter_resp = _create_interview(client, recruiter_headers, [problem_id])
    assert recruiter_resp.status_code == 200

    admin_resp = _create_interview(client, admin_headers, [problem_id])
    assert admin_resp.status_code == 200


def test_candidate_session_save_submit_and_logs(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session)
    admin_headers = _create_admin(client, db_session)
    problem_id = _create_problem(client, admin_headers, suffix="2")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["candidate@example.com"]},
        headers=recruiter_headers,
    )
    assert candidates_resp.status_code == 200
    token = candidates_resp.json()[0]["token"]

    session_resp = client.get(f"/interview/session?token={token}")
    assert session_resp.status_code == 200
    assert session_resp.json()["status"] == "pending"
    assert session_resp.json()["started_at"] is None

    start_resp = client.post(f"/interview/start?token={token}")
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "started"
    assert start_resp.json()["started_at"] is not None

    save_resp = client.post(
        "/interview/save",
        json={"token": token, "problem_id": problem_id, "language": "python", "code": "print(1)"},
    )
    assert save_resp.status_code == 200
    saved = (
        db_session.query(InterviewSubmission)
        .filter(InterviewSubmission.problem_id == problem_id)
        .first()
    )
    assert saved is not None
    assert saved.code == "print(1)"

    log_resp = client.post(
        "/interview/log",
        json={"token": token, "event_type": "tab_blur", "meta": {"count": 1}},
    )
    assert log_resp.status_code == 200

    submit_resp = client.post("/interview/submit", json={"token": token})
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "submitted"

    submissions_resp = client.get(f"/interviews/{interview_id}/submissions", headers=recruiter_headers)
    assert submissions_resp.status_code == 200
    assert submissions_resp.json()[0]["candidate_email"] == "candidate@example.com"

    logs_resp = client.get(f"/interviews/{interview_id}/logs", headers=recruiter_headers)
    assert logs_resp.status_code == 200
    assert logs_resp.json()[0]["event_type"] == "tab_blur"


def test_expired_candidate_token_returns_gone(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-expired@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-expired@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="3")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["expired@example.com"]},
        headers=recruiter_headers,
    )
    token = candidates_resp.json()[0]["token"]
    client.post(f"/interview/start?token={token}")

    candidate = db_session.query(InterviewCandidate).filter(InterviewCandidate.token == token).first()
    candidate.started_at = datetime.utcnow() - timedelta(minutes=60)
    candidate.status = "started"
    db_session.commit()

    session_resp = client.get(f"/interview/session?token={token}")
    assert session_resp.status_code == 410

    db_session.refresh(candidate)
    assert candidate.status == "expired"


def test_candidate_token_cannot_access_recruiter_routes(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-security@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-security@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="4")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["security@example.com"]},
        headers=recruiter_headers,
    )
    token = candidates_resp.json()[0]["token"]

    resp = client.get(
        f"/interviews/{interview_id}/candidates",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
