from app.models import User
from tests.test_auth import _register_user, _login_user


def _make_admin(client, db_session, email):
    _register_user(client, email=email)
    user = db_session.query(User).filter(User.email == email).first()
    user.is_admin = True
    db_session.commit()
    login = _login_user(client, email=email)
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_duplicate_email(client):
    first = _register_user(client, email="dup@example.com")
    assert first.status_code == 200
    second = _register_user(client, email="dup@example.com")
    assert second.status_code == 200
    assert second.json()["status"] == "error"


def test_login_invalid_password(client):
    _register_user(client, email="pw@example.com", password="Test123!")
    resp = _login_user(client, email="pw@example.com", password="Wrong123!")
    assert resp.status_code == 401


def test_admin_requires_token(client):
    resp = client.post("/tag/", json={"name": "dp"})
    assert resp.status_code == 401


def test_admin_rejects_non_admin(client):
    _register_user(client, email="user2@example.com")
    login = _login_user(client, email="user2@example.com")
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/tag/", json={"name": "dp"}, headers=headers)
    assert resp.status_code == 403


def test_problem_pagination_limits(client, db_session):
    headers = _make_admin(client, db_session, "admin2@example.com")
    tag = client.post("/tag/", json={"name": "arrays2"}, headers=headers).json()
    client.post(
        "/problem/",
        json={
            "title": "P1",
            "difficulty": "Easy",
            "external_link": None,
            "description": "d",
            "constraints": None,
            "tag_ids": [tag["id"]],
        },
        headers=headers,
    )
    resp = client.get("/problem/?page_size=101")
    assert resp.status_code == 422


def test_saved_solution_upsert(client, db_session):
    headers = _make_admin(client, db_session, "admin3@example.com")
    tag = client.post("/tag/", json={"name": "arrays3"}, headers=headers).json()
    problem = client.post(
        "/problem/",
        json={
            "title": "P2",
            "difficulty": "Easy",
            "external_link": None,
            "description": "d",
            "constraints": None,
            "tag_ids": [tag["id"]],
        },
        headers=headers,
    ).json()

    first = client.post(
        "/saved-solution/",
        json={"problem_id": problem["id"], "code": "a"},
        headers=headers,
    )
    assert first.status_code == 200
    second = client.post(
        "/saved-solution/",
        json={"problem_id": problem["id"], "code": "b"},
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["code"] == "b"
