from app.services.rate_limiter import reset_rate_limiter
from config import settings
from tests.test_auth import _auth_headers_from_client, _login_user, _register_user


def test_auth_login_rate_limit(client):
    old_enabled = settings.RATE_LIMIT_ENABLED
    old_login_limit = settings.RATE_LIMIT_AUTH_LOGIN
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_AUTH_LOGIN = "2/minute"
    try:
        reset_rate_limiter()

        register_payload = {
            "name": "Rate Limit User",
            "email": "ratelimit@example.com",
            "password": "StrongPass1!",
            "role": "user",
        }
        register_resp = client.post("/auth/register", json=register_payload)
        assert register_resp.status_code == 200, register_resp.text

        login_payload = {
            "username": register_payload["email"],
            "password": "wrong-password",
        }
        first = client.post("/auth/login", data=login_payload)
        second = client.post("/auth/login", data=login_payload)
        third = client.post("/auth/login", data=login_payload)

        assert first.status_code == 401
        assert second.status_code == 401
        assert third.status_code == 429
        assert third.json()["detail"] == "Rate limit exceeded"
    finally:
        settings.RATE_LIMIT_ENABLED = old_enabled
        settings.RATE_LIMIT_AUTH_LOGIN = old_login_limit
        reset_rate_limiter()


def test_submission_run_rate_limit(client):
    old_enabled = settings.RATE_LIMIT_ENABLED
    old_run_limit = settings.RATE_LIMIT_SUBMISSION_RUN
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_SUBMISSION_RUN = "2/minute"
    try:
        reset_rate_limiter()
        payload = {
            "problem_id": 999999,
            "language": "python",
            "code": "print(1)",
        }
        first = client.post("/submission/run", json=payload)
        second = client.post("/submission/run", json=payload)
        third = client.post("/submission/run", json=payload)

        assert first.status_code in {404, 502}
        assert second.status_code in {404, 502}
        assert third.status_code == 429
        assert third.json()["detail"] == "Rate limit exceeded"
    finally:
        settings.RATE_LIMIT_ENABLED = old_enabled
        settings.RATE_LIMIT_SUBMISSION_RUN = old_run_limit
        reset_rate_limiter()


def test_submission_submit_rate_limit(client):
    old_enabled = settings.RATE_LIMIT_ENABLED
    old_submit_limit = settings.RATE_LIMIT_SUBMISSION_SUBMIT
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_SUBMISSION_SUBMIT = "2/minute"
    try:
        reset_rate_limiter()
        _register_user(client, email="submit-rate@example.com")
        _login_user(client, email="submit-rate@example.com")
        headers = _auth_headers_from_client(client)
        payload = {
            "problem_id": 999999,
            "language": "python",
            "code": "print(1)",
        }
        first = client.post("/submission/submit", json=payload, headers=headers)
        second = client.post("/submission/submit", json=payload, headers=headers)
        third = client.post("/submission/submit", json=payload, headers=headers)

        assert first.status_code in {404, 502}
        assert second.status_code in {404, 502}
        assert third.status_code == 429
        assert third.json()["detail"] == "Rate limit exceeded"
    finally:
        settings.RATE_LIMIT_ENABLED = old_enabled
        settings.RATE_LIMIT_SUBMISSION_SUBMIT = old_submit_limit
        reset_rate_limiter()
