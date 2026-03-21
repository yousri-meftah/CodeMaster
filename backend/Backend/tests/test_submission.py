import pytest

from tests.test_auth import _register_user, _login_user


def _auth_headers(client):
    _register_user(client, email="submit@example.com")
    login = _login_user(client, email="submit@example.com")
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_problem(client, headers):
    tag_resp = client.post("/tag/", json={"name": "math"}, headers=headers)
    tag_id = tag_resp.json()["id"]
    payload = {
        "title": "Sum of Two Numbers",
        "difficulty": "Easy",
        "external_link": None,
        "description": "Return the sum of two integers.",
        "constraints": "Input size small.",
        "tag_ids": [tag_id],
        "test_cases": [
            {"input_text": "1 2", "output_text": "3", "is_sample": True, "order": 0},
            {"input_text": "2 2", "output_text": "4", "is_sample": False, "order": 1},
        ],
    }
    create_resp = client.post("/problem/", json=payload, headers=headers)
    return create_resp.json()["id"]


@pytest.mark.skip(reason="Relies on third-party execution service (piston) currently offline.")
def test_submit_submission(monkeypatch, client):
    headers = _auth_headers(client)
    problem_id = _create_problem(client, headers)

    def fake_execute_test_cases(language, source_code, test_cases):
        return [
            {
                "id": tc.get("id"),
                "input_text": tc.get("input_text"),
                "output_text": tc.get("output_text"),
                "is_sample": tc.get("is_sample", True),
                "stdout": tc.get("output_text"),
                "stderr": "",
                "compile_output": None,
                "status_id": 0,
                "status": "OK",
                "time": None,
                "memory": None,
                "passed": True,
            }
            for tc in test_cases
        ]

    from app.services import piston

    monkeypatch.setattr(piston, "execute_test_cases", fake_execute_test_cases)

    payload = {
        "problem_id": problem_id,
        "language": "python",
        "code": "print(sum(map(int, input().split())))",
    }
    resp = client.post("/submission/submit", json=payload, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["verdict"] == "AC"
    assert body["passed"] == body["total"]
