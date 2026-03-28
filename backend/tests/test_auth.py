from urllib.parse import parse_qs, urlparse

from app.models import OAuthAccount, RefreshToken, User
from database import get_db
from main import app


def _register_user(client, email="test@example.com", password="Test123!"):
    payload = {
        "name": "Test User",
        "email": email,
        "phone": "123456789",
        "password": password,
    }
    return client.post("/auth/register", json=payload)


def _login_user(client, email="test@example.com", password="Test123!"):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def _auth_headers_from_client(client):
    token = client.cookies.get("access_token")
    return {"Authorization": f"Bearer {token}"}


def test_register_accepts_asterisk_in_password(client):
    register = _register_user(client, email="asterisk@example.com", password="Test123*")
    assert register.status_code == 200
    assert register.json()["user"]["email"] == "asterisk@example.com"
    assert client.cookies.get("access_token")
    assert client.cookies.get("refresh_token")


def test_register_login_and_me(client):
    register = _register_user(client)
    assert register.status_code == 200
    assert register.json()["user"]["email"] == "test@example.com"

    login = _login_user(client)
    assert login.status_code == 200
    assert client.cookies.get("access_token")
    assert client.cookies.get("refresh_token")

    me = client.get("/auth/me")
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "test@example.com"
    assert body["role"] == "user"


def test_me_does_not_require_db_dependency(client):
    _register_user(client, email="claims@example.com")

    def broken_db():
        raise AssertionError("db should not be requested for /auth/me")
        yield

    app.dependency_overrides[get_db] = broken_db
    try:
        me = client.get("/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == "claims@example.com"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_refresh_rotates_refresh_token_and_logout_revokes_session(client, db_session):
    _register_user(client, email="refresh@example.com")
    original_refresh = client.cookies.get("refresh_token")
    original_access = client.cookies.get("access_token")

    refreshed = client.post("/auth/refresh")
    assert refreshed.status_code == 200
    assert client.cookies.get("refresh_token")
    assert client.cookies.get("access_token")
    assert client.cookies.get("refresh_token") != original_refresh
    assert client.cookies.get("access_token") != original_access

    rows = db_session.query(RefreshToken).order_by(RefreshToken.id.asc()).all()
    assert len(rows) == 2
    assert rows[0].revoked_at is not None
    assert rows[1].revoked_at is None

    logout = client.post("/auth/logout")
    assert logout.status_code == 204

    latest = db_session.query(RefreshToken).order_by(RefreshToken.id.desc()).first()
    assert latest.revoked_at is not None

    after_logout_refresh = client.post("/auth/refresh")
    assert after_logout_refresh.status_code == 401


def test_oauth_callback_links_existing_user(client, db_session, monkeypatch):
    _register_user(client, email="oauth-link@example.com")
    client.post("/auth/logout")

    async def fake_exchange(provider: str, code: str) -> str:
        return "provider-token"

    async def fake_profile(provider: str, access_token: str) -> dict:
        return {"sub": "google-user-1", "email": "oauth-link@example.com", "name": "OAuth Link"}

    monkeypatch.setattr("app.controllers.auth_oauth._exchange_code", fake_exchange)
    monkeypatch.setattr("app.controllers.auth_oauth._load_provider_profile", fake_profile)

    callback = client.get("/auth/oauth/google/callback", params={"code": "abc", "state": "bad-state"})
    assert callback.status_code == 400

    auth_url = client.get("/auth/oauth/google/start").json()["authorization_url"]
    state = parse_qs(urlparse(auth_url).query)["state"][0]
    callback = client.get(
        "/auth/oauth/google/callback",
        params={"code": "abc", "state": state},
        follow_redirects=False,
    )
    assert callback.status_code == 302
    assert "requires_role_selection=0" in callback.headers["location"]

    user = db_session.query(User).filter(User.email == "oauth-link@example.com").first()
    assert user is not None
    linked = db_session.query(OAuthAccount).filter(OAuthAccount.user_id == user.id, OAuthAccount.provider == "google").first()
    assert linked is not None


def test_first_time_oauth_requires_role_selection(client, db_session, monkeypatch):
    async def fake_exchange(provider: str, code: str) -> str:
        return "provider-token"

    async def fake_profile(provider: str, access_token: str) -> dict:
        return {"id": 12345, "email": "new-social@example.com", "login": "new-social"}

    monkeypatch.setattr("app.controllers.auth_oauth._exchange_code", fake_exchange)
    monkeypatch.setattr("app.controllers.auth_oauth._load_provider_profile", fake_profile)

    auth_url = client.get("/auth/oauth/github/start").json()["authorization_url"]
    state = parse_qs(urlparse(auth_url).query)["state"][0]
    callback = client.get(
        "/auth/oauth/github/callback",
        params={"code": "abc", "state": state},
        follow_redirects=False,
    )
    assert callback.status_code == 302
    assert "requires_role_selection=1" in callback.headers["location"]

    role_resp = client.post("/auth/social-role", json={"role": "recruiter"})
    assert role_resp.status_code == 200
    assert role_resp.json()["user"]["role"] == "recruiter"

    user = db_session.query(User).filter(User.email == "new-social@example.com").first()
    assert user.role == "recruiter"
