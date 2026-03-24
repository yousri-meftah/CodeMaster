from app.services.rate_limiter import reset_rate_limiter
from config import settings


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
