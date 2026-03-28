from datetime import datetime, timedelta

from app.models import InterviewCandidate, InterviewMediaSegment, InterviewSubmission, User
from tests.test_auth import _auth_headers_from_client, _login_user, _register_user


def _set_role(db_session, email: str, role: str, is_admin: bool = False):
    user = db_session.query(User).filter(User.email == email).first()
    user.role = role
    user.is_admin = is_admin
    db_session.commit()


def _auth_headers(client, email: str):
    _login_user(client, email=email)
    return _auth_headers_from_client(client)


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
    token = candidates_resp.json()["candidates"][0]["token"]

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
        json={
            "token": token,
            "problem_id": problem_id,
            "language": "python",
            "code": "print(1)",
            "change_summary": {"inserted_lines": 1, "removed_lines": 0, "changed": True},
        },
    )
    assert save_resp.status_code == 200
    saved = (
        db_session.query(InterviewSubmission)
        .filter(InterviewSubmission.problem_id == problem_id)
        .first()
    )
    assert saved is not None
    assert saved.code == "print(1)"
    assert saved.change_summary == {"inserted_lines": 1, "removed_lines": 0, "changed": True}

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


def test_recruiter_can_update_candidate_status(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-status@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-status@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="5")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["status@example.com"]},
        headers=recruiter_headers,
    )
    candidate_id = candidates_resp.json()["candidates"][0]["id"]

    resp = client.patch(
        f"/interviews/{interview_id}/candidates/{candidate_id}/status",
        json={"status": "submitted"},
        headers=recruiter_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "submitted"


def test_resetting_submitted_candidate_to_pending_clears_attempt_data(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-reset@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-reset@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="reset")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["reset@example.com"]},
        headers=recruiter_headers,
    )
    candidate_payload = candidates_resp.json()["candidates"][0]
    candidate_id = candidate_payload["id"]
    original_token = candidate_payload["token"]

    client.post(f"/interview/start?token={original_token}")
    client.post(
        "/interview/save",
        json={"token": original_token, "problem_id": problem_id, "language": "python", "code": "print('reset')"},
    )
    client.post(
        "/interview/log",
        json={"token": original_token, "event_type": "copy", "meta": {"count": 1}},
    )
    client.post(
        "/interview/media/segments",
        data={
          "token": original_token,
          "media_kind": "combined",
          "sequence_number": 1,
          "mime_type": "video/webm",
        },
        files={"file": ("segment-1.webm", b"reset-bytes", "video/webm")},
    )
    client.post("/interview/submit", json={"token": original_token})

    reset_resp = client.patch(
        f"/interviews/{interview_id}/candidates/{candidate_id}/status",
        json={"status": "pending"},
        headers=recruiter_headers,
    )
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "pending"
    assert reset_resp.json()["token"] != original_token
    assert reset_resp.json()["invite_status"] == "pending"
    assert reset_resp.json()["invite_sent_at"] is None
    assert reset_resp.json()["started_at"] is None
    assert reset_resp.json()["submitted_at"] is None

    candidate = db_session.query(InterviewCandidate).filter(InterviewCandidate.id == candidate_id).first()
    assert candidate is not None
    assert candidate.last_seen_at is None
    assert db_session.query(InterviewSubmission).filter(InterviewSubmission.candidate_id == candidate_id).count() == 0
    assert db_session.query(InterviewMediaSegment).filter(InterviewMediaSegment.candidate_id == candidate_id).count() == 0
    assert client.get(f"/interviews/{interview_id}/candidates/{candidate_id}/logs", headers=recruiter_headers).json() == []


def test_only_submitted_candidates_can_be_reset_to_pending(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-reset-guard@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-reset-guard@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="reset-guard")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["reset-guard@example.com"]},
        headers=recruiter_headers,
    )
    candidate_id = candidates_resp.json()["candidates"][0]["id"]

    resp = client.patch(
        f"/interviews/{interview_id}/candidates/{candidate_id}/status",
        json={"status": "pending"},
        headers=recruiter_headers,
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Only submitted candidates can be reset to pending"


def test_candidate_review_endpoints_are_scoped_to_one_candidate(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-review@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-review@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="6")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["candidate-a@example.com", "candidate-b@example.com"]},
        headers=recruiter_headers,
    )
    candidate_a = candidates_resp.json()["candidates"][0]
    candidate_b = candidates_resp.json()["candidates"][1]

    client.post(f"/interview/start?token={candidate_a['token']}")
    client.post(
        "/interview/save",
        json={"token": candidate_a["token"], "problem_id": problem_id, "language": "python", "code": "print(1)"},
    )
    client.post(
        "/interview/log",
        json={"token": candidate_a["token"], "event_type": "copy", "meta": {"count": 1}},
    )

    review_resp = client.get(f"/interviews/{interview_id}/candidates/{candidate_a['id']}", headers=recruiter_headers)
    assert review_resp.status_code == 200
    assert review_resp.json()["id"] == candidate_a["id"]
    assert review_resp.json()["submission_count"] == 1
    assert review_resp.json()["log_count"] == 1

    submissions_resp = client.get(
        f"/interviews/{interview_id}/candidates/{candidate_a['id']}/submissions",
        headers=recruiter_headers,
    )
    assert submissions_resp.status_code == 200
    assert len(submissions_resp.json()) == 1
    assert submissions_resp.json()[0]["candidate_id"] == candidate_a["id"]

    logs_resp = client.get(
        f"/interviews/{interview_id}/candidates/{candidate_a['id']}/logs",
        headers=recruiter_headers,
    )
    assert logs_resp.status_code == 200
    assert len(logs_resp.json()) == 1
    assert logs_resp.json()[0]["candidate_id"] == candidate_a["id"]

    other_resp = client.get(
        f"/interviews/{interview_id}/candidates/{candidate_b['id']}/submissions",
        headers=recruiter_headers,
    )
    assert other_resp.status_code == 200
    assert other_resp.json() == []


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
    token = candidates_resp.json()["candidates"][0]["token"]
    client.post(f"/interview/start?token={token}")

    candidate = db_session.query(InterviewCandidate).filter(InterviewCandidate.token == token).first()
    candidate.started_at = datetime.utcnow() - timedelta(minutes=60)
    candidate.status = "started"
    db_session.commit()

    session_resp = client.get(f"/interview/session?token={token}")
    assert session_resp.status_code == 410

    db_session.refresh(candidate)
    assert candidate.status == "expired"


def test_pending_candidate_availability_uses_invite_sent_time(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-availability@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-availability@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="availability")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["availability@example.com"]},
        headers=recruiter_headers,
    )
    token = candidates_resp.json()["candidates"][0]["token"]
    candidate = db_session.query(InterviewCandidate).filter(InterviewCandidate.token == token).first()
    candidate.created_at = datetime.utcnow() - timedelta(days=30)
    candidate.invite_sent_at = datetime.utcnow()
    db_session.commit()

    session_resp = client.get(f"/interview/session?token={token}")
    assert session_resp.status_code == 200
    assert session_resp.json()["status"] == "pending"


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
    token = candidates_resp.json()["candidates"][0]["token"]

    resp = client.get(
        f"/interviews/{interview_id}/candidates",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401


def test_interview_media_upload_status_and_recruiter_review(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-media@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-media@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="media")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["media@example.com"]},
        headers=recruiter_headers,
    )
    candidate = candidates_resp.json()["candidates"][0]
    token = candidate["token"]

    client.post(f"/interview/start?token={token}")
    upload = client.post(
        "/interview/media/segments",
        data={
            "token": token,
            "media_kind": "combined",
            "sequence_number": 1,
            "mime_type": "video/webm",
            "started_at": "2026-03-28T10:00:00Z",
            "ended_at": "2026-03-28T10:00:05Z",
            "duration_ms": 5000,
        },
        files={"file": ("segment-1.webm", b"fake-webm-bytes", "video/webm")},
    )
    assert upload.status_code == 200
    assert upload.json()["sequence_number"] == 1

    status_resp = client.get("/interview/media/status", params={"token": token})
    assert status_resp.status_code == 200
    assert status_resp.json()["uploaded_segments"] == 1

    media_rows = db_session.query(InterviewMediaSegment).filter(InterviewMediaSegment.candidate_id == candidate["id"]).all()
    assert len(media_rows) == 1

    recruiter_media = client.get(f"/interviews/{interview_id}/candidates/{candidate['id']}/media", headers=recruiter_headers)
    assert recruiter_media.status_code == 200
    assert recruiter_media.json()[0]["download_url"].endswith(f"/interviews/{interview_id}/candidates/{candidate['id']}/media/{media_rows[0].id}")

    stream = client.get(f"/interviews/{interview_id}/candidates/{candidate['id']}/media/{media_rows[0].id}", headers=recruiter_headers)
    assert stream.status_code == 200
    assert stream.content == b"fake-webm-bytes"


def test_interview_media_upload_rejected_after_submit_and_media_flags_visible(client, db_session):
    recruiter_headers = _create_recruiter(client, db_session, email="recruiter-media-flags@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-media-flags@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="media-flags")
    interview_resp = _create_interview(client, recruiter_headers, [problem_id])
    interview_id = interview_resp.json()["id"]

    candidates_resp = client.post(
        f"/interviews/{interview_id}/candidates",
        json={"emails": ["media-flags@example.com"]},
        headers=recruiter_headers,
    )
    candidate = candidates_resp.json()["candidates"][0]
    token = candidate["token"]

    client.post(f"/interview/start?token={token}")
    log_resp = client.post(
        "/interview/log",
        json={"token": token, "event_type": "media_permission_denied", "meta": {"device": "camera"}},
    )
    assert log_resp.status_code == 200

    submit_resp = client.post("/interview/submit", json={"token": token})
    assert submit_resp.status_code == 200

    rejected = client.post(
        "/interview/media/segments",
        data={
            "token": token,
            "media_kind": "combined",
            "sequence_number": 2,
            "mime_type": "video/webm",
        },
        files={"file": ("segment-2.webm", b"late-upload", "video/webm")},
    )
    assert rejected.status_code == 409

    logs_resp = client.get(f"/interviews/{interview_id}/candidates/{candidate['id']}/logs", headers=recruiter_headers)
    assert logs_resp.status_code == 200
    assert any(log["event_type"] == "media_permission_denied" for log in logs_resp.json())
