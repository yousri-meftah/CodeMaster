from app.models import User
from tests.test_auth import _auth_headers_from_client, _register_user, _login_user


def _auth_headers(client, db_session):
    _register_user(client, email="problem@example.com")
    user = db_session.query(User).filter(User.email == "problem@example.com").first()
    user.is_admin = True
    db_session.commit()

    _login_user(client, email="problem@example.com")
    return _auth_headers_from_client(client)


def test_problem_create_and_list(client, db_session):
    headers = _auth_headers(client, db_session)

    tag_resp = client.post("/tag/", json={"name": "arrays"}, headers=headers)
    assert tag_resp.status_code == 200
    tag_id = tag_resp.json()["id"]

    payload = {
        "title": "Sum of Two Numbers",
        "difficulty": "Easy",
        "external_link": None,
        "description": "Return the sum of two integers.",
        "constraints": "Input size small.",
        "tag_ids": [tag_id],
        "test_cases": [
            {"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0}
        ],
    }
    create_resp = client.post("/problem/", json=payload, headers=headers)
    assert create_resp.status_code == 200
    problem_id = create_resp.json()["id"]

    list_resp = client.get("/problem/")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1

    get_resp = client.get(f"/problem/{problem_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == problem_id
