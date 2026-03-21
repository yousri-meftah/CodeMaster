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


def _make_user(client, email):
    _register_user(client, email=email)
    login = _login_user(client, email=email)
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_only_endpoints_require_admin(client, db_session):
    user_headers = _make_user(client, "user1@example.com")

    tag_resp = client.post("/tag/", json={"name": "dp"}, headers=user_headers)
    assert tag_resp.status_code == 403

    problem_resp = client.post(
        "/problem/",
        json={
            "title": "Two Sum",
            "difficulty": "Easy",
            "external_link": None,
            "description": "desc",
            "constraints": None,
            "tag_ids": [],
        },
        headers=user_headers,
    )
    assert problem_resp.status_code == 403

    article_resp = client.post(
        "/articles/",
        json={"title": "A", "content": "B"},
        headers=user_headers,
    )
    assert article_resp.status_code == 403

    roadmap_resp = client.post(
        "/roadmap/",
        json={"title": "R", "problem_ids_ordered": []},
        headers=user_headers,
    )
    assert roadmap_resp.status_code == 403


def test_admin_can_create_content(client, db_session):
    admin_headers = _make_admin(client, db_session, "admin@example.com")

    tag_resp = client.post("/tag/", json={"name": "arrays"}, headers=admin_headers)
    assert tag_resp.status_code == 200
    tag_id = tag_resp.json()["id"]

    problem_resp = client.post(
        "/problem/",
        json={
            "title": "Sum of Two Numbers",
            "difficulty": "Easy",
            "external_link": None,
            "description": "desc",
            "constraints": None,
            "tag_ids": [tag_id],
        },
        headers=admin_headers,
    )
    assert problem_resp.status_code == 200

    article_resp = client.post(
        "/articles/",
        json={"title": "Title", "content": "Body"},
        headers=admin_headers,
    )
    assert article_resp.status_code == 200

    roadmap_resp = client.post(
        "/roadmap/",
        json={"title": "Roadmap", "problem_ids_ordered": []},
        headers=admin_headers,
    )
    assert roadmap_resp.status_code == 200


def test_saved_solution_requires_auth(client):
    resp = client.post("/SavedSolution/", json={"problem_id": 1, "code": "x"})
    assert resp.status_code == 401
