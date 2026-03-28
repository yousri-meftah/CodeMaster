from app.models import User
from app.services.admin_bootstrap import bootstrap_admin
from app.services.auth import verify_password
from config import settings
from tests.test_auth import _auth_headers_from_client, _login_user, _register_user


def _set_role(db_session, email: str, role: str, is_admin: bool = False):
    user = db_session.query(User).filter(User.email == email).first()
    user.role = role
    user.is_admin = is_admin
    db_session.commit()


def _auth_headers(client, email: str):
    _login_user(client, email=email)
    return _auth_headers_from_client(client)


def _create_recruiter(client, db_session, email="recruiter-bootstrap@example.com"):
    _register_user(client, email=email)
    _set_role(db_session, email, "recruiter")
    return _auth_headers(client, email)


def _create_admin(client, db_session, email="admin-bootstrap@example.com"):
    _register_user(client, email=email)
    _set_role(db_session, email, "admin", is_admin=True)
    return _auth_headers(client, email)


def _create_problem(client, headers, suffix="seed"):
    tag_resp = client.post("/tag/", json={"name": f"hardening-{suffix}"}, headers=headers)
    tag_id = tag_resp.json()["id"]
    payload = {
        "title": f"Hardening Problem {suffix}",
        "difficulty": "Easy",
        "external_link": None,
        "description": "desc",
        "constraints": "constraints",
        "tag_ids": [tag_id],
        "test_cases": [{"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0}],
    }
    create_resp = client.post("/problem/", json=payload, headers=headers)
    return create_resp.json()["id"]


def _create_interview(client, headers, problem_id: int):
    payload = {
        "title": "Hardening Interview",
        "description": "desc",
        "difficulty": "Easy",
        "duration_minutes": 30,
        "availability_days": 2,
        "settings": {},
        "status": "active",
        "problems": [{"problem_id": problem_id, "order": 0}],
    }
    resp = client.post("/interviews/", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_docs_and_openapi_are_disabled(client):
    docs_resp = client.get("/docs")
    openapi_resp = client.get("/openapi.json")
    assert docs_resp.status_code == 404
    assert openapi_resp.status_code == 404


def test_admin_bootstrap_creates_or_updates_admin(db_session):
    old_enabled = settings.ADMIN_BOOTSTRAP_ENABLED
    old_email = settings.ADMIN_EMAIL
    old_password = settings.ADMIN_PASSWORD
    old_name = settings.ADMIN_NAME
    try:
        settings.ADMIN_BOOTSTRAP_ENABLED = True
        settings.ADMIN_EMAIL = "bootstrap-admin@example.com"
        settings.ADMIN_PASSWORD = "Admin123!"
        settings.ADMIN_NAME = "Bootstrap Admin"

        result = bootstrap_admin(db_session)
        assert result == "created"
        created = db_session.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        assert created is not None
        assert created.is_admin is True
        assert created.role == "admin"
        assert created.name == "Bootstrap Admin"
        assert verify_password("Admin123!", created.password)

        settings.ADMIN_PASSWORD = "Admin456!"
        update_result = bootstrap_admin(db_session)
        assert update_result == "updated"
        db_session.refresh(created)
        assert verify_password("Admin456!", created.password)
        assert created.is_admin is True
        assert created.role == "admin"
    finally:
        settings.ADMIN_BOOTSTRAP_ENABLED = old_enabled
        settings.ADMIN_EMAIL = old_email
        settings.ADMIN_PASSWORD = old_password
        settings.ADMIN_NAME = old_name


def test_add_candidates_marks_failed_invite_and_resend_updates_status(client, db_session, monkeypatch):
    recruiter_headers = _create_recruiter(client, db_session, email="invite-owner@example.com")
    admin_headers = _create_admin(client, db_session, email="invite-admin@example.com")
    outsider_headers = _create_recruiter(client, db_session, email="invite-outsider@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="invite")
    interview_id = _create_interview(client, recruiter_headers, problem_id)

    old_mail_enabled = settings.MAIL_SEND_ENABLED
    settings.MAIL_SEND_ENABLED = True
    try:
        def _raise_send(*args, **kwargs):
            raise RuntimeError("smtp down")

        monkeypatch.setattr("app.services.interview.send_email", _raise_send)

        add_resp = client.post(
            f"/interviews/{interview_id}/candidates",
            json={"emails": ["invitee@example.com"]},
            headers=recruiter_headers,
        )
        assert add_resp.status_code == 200, add_resp.text
        body = add_resp.json()
        assert len(body["candidates"]) == 1
        candidate = body["candidates"][0]
        assert candidate["invite_status"] == "failed"
        assert candidate["invite_attempts"] == 1
        assert body["invite_results"][0]["status"] == "failed"
        assert "smtp down" in (body["invite_results"][0]["error"] or "")

        forbidden_resend = client.post(
            f"/interviews/{interview_id}/candidates/{candidate['id']}/resend-invite",
            headers=outsider_headers,
        )
        assert forbidden_resend.status_code == 403

        monkeypatch.setattr("app.services.interview.send_email", lambda *args, **kwargs: None)

        resend_resp = client.post(
            f"/interviews/{interview_id}/candidates/{candidate['id']}/resend-invite",
            headers=recruiter_headers,
        )
        assert resend_resp.status_code == 200, resend_resp.text
        resend_body = resend_resp.json()
        assert resend_body["candidate"]["invite_status"] == "sent"
        assert resend_body["candidate"]["invite_attempts"] >= 2
        assert resend_body["invite"]["status"] == "sent"
        assert resend_body["invite"]["error"] is None
    finally:
        settings.MAIL_SEND_ENABLED = old_mail_enabled


def test_resend_invite_has_30_minute_cooldown(client, db_session, monkeypatch):
    recruiter_headers = _create_recruiter(client, db_session, email="cooldown-owner@example.com")
    admin_headers = _create_admin(client, db_session, email="cooldown-admin@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="cooldown")
    interview_id = _create_interview(client, recruiter_headers, problem_id)

    old_mail_enabled = settings.MAIL_SEND_ENABLED
    old_cooldown = settings.INTERVIEW_INVITE_RESEND_COOLDOWN_MINUTES
    settings.MAIL_SEND_ENABLED = True
    settings.INTERVIEW_INVITE_RESEND_COOLDOWN_MINUTES = 30
    try:
        monkeypatch.setattr("app.services.interview.send_email", lambda *args, **kwargs: None)
        add_resp = client.post(
            f"/interviews/{interview_id}/candidates",
            json={"emails": ["cooldown@example.com"]},
            headers=recruiter_headers,
        )
        assert add_resp.status_code == 200, add_resp.text
        candidate = add_resp.json()["candidates"][0]
        assert candidate["invite_status"] == "sent"

        resend_resp = client.post(
            f"/interviews/{interview_id}/candidates/{candidate['id']}/resend-invite",
            headers=recruiter_headers,
        )
        assert resend_resp.status_code == 429
        assert "Retry-After" in resend_resp.headers
    finally:
        settings.MAIL_SEND_ENABLED = old_mail_enabled
        settings.INTERVIEW_INVITE_RESEND_COOLDOWN_MINUTES = old_cooldown


def test_only_owner_can_update_or_delete_interview(client, db_session):
    owner_headers = _create_recruiter(client, db_session, email="owner-edit@example.com")
    other_headers = _create_recruiter(client, db_session, email="other-edit@example.com")
    admin_headers = _create_admin(client, db_session, email="admin-edit@example.com")
    problem_id = _create_problem(client, admin_headers, suffix="owner-only")
    interview_id = _create_interview(client, owner_headers, problem_id)

    update_payload = {
        "title": "Updated by owner",
        "description": "owner can update",
        "difficulty": "Medium",
        "duration_minutes": 45,
        "availability_days": 3,
        "settings": {"anti_cheat": True},
        "status": "active",
        "problems": [{"problem_id": problem_id, "order": 0}],
    }

    forbidden_update = client.put(f"/interviews/{interview_id}", json=update_payload, headers=other_headers)
    assert forbidden_update.status_code == 403

    forbidden_admin_update = client.put(f"/interviews/{interview_id}", json=update_payload, headers=admin_headers)
    assert forbidden_admin_update.status_code == 403

    owner_update = client.put(f"/interviews/{interview_id}", json=update_payload, headers=owner_headers)
    assert owner_update.status_code == 200
    assert owner_update.json()["title"] == "Updated by owner"

    forbidden_delete = client.delete(f"/interviews/{interview_id}", headers=other_headers)
    assert forbidden_delete.status_code == 403

    forbidden_admin_delete = client.delete(f"/interviews/{interview_id}", headers=admin_headers)
    assert forbidden_admin_delete.status_code == 403

    owner_delete = client.delete(f"/interviews/{interview_id}", headers=owner_headers)
    assert owner_delete.status_code == 204
