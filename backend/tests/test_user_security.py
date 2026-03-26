from app.models import User
from tests.test_auth import _login_user, _register_user


def _auth_headers(client, email="user-security@example.com", password="Test123!"):
    login = _login_user(client, email=email, password=password)
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _make_admin(client, db_session, email="admin-user-security@example.com"):
    _register_user(client, email=email)
    user = db_session.query(User).filter(User.email == email).first()
    user.is_admin = True
    user.role = "admin"
    db_session.commit()
    return _auth_headers(client, email=email)


def test_user_detail_requires_self_or_admin(client, db_session):
    _register_user(client, email="alice@example.com")
    _register_user(client, email="bob@example.com")
    alice = db_session.query(User).filter(User.email == "alice@example.com").first()
    bob = db_session.query(User).filter(User.email == "bob@example.com").first()

    alice_headers = _auth_headers(client, email="alice@example.com")
    admin_headers = _make_admin(client, db_session)

    own_resp = client.get(f"/user/{alice.id}", headers=alice_headers)
    assert own_resp.status_code == 200

    forbidden_resp = client.get(f"/user/{bob.id}", headers=alice_headers)
    assert forbidden_resp.status_code == 403

    admin_resp = client.get(f"/user/{bob.id}", headers=admin_headers)
    assert admin_resp.status_code == 200


def test_user_collection_requires_admin(client, db_session):
    _register_user(client, email="list-user@example.com")
    user_headers = _auth_headers(client, email="list-user@example.com")
    admin_headers = _make_admin(client, db_session, email="list-admin@example.com")

    forbidden_resp = client.get("/user/", headers=user_headers)
    assert forbidden_resp.status_code == 403

    admin_resp = client.get("/user/", headers=admin_headers)
    assert admin_resp.status_code == 200


def test_user_update_and_delete_require_self_or_admin(client, db_session):
    _register_user(client, email="owner@example.com")
    _register_user(client, email="other@example.com")
    owner = db_session.query(User).filter(User.email == "owner@example.com").first()
    other = db_session.query(User).filter(User.email == "other@example.com").first()

    owner_headers = _auth_headers(client, email="owner@example.com")
    other_headers = _auth_headers(client, email="other@example.com")

    forbidden_update = client.put(f"/user/{owner.id}", json={"name": "Intruder"}, headers=other_headers)
    assert forbidden_update.status_code == 403

    own_update = client.put(f"/user/{owner.id}", json={"name": "Updated Owner"}, headers=owner_headers)
    assert own_update.status_code == 200
    assert own_update.json()["name"] == "Updated Owner"

    forbidden_delete = client.delete(f"/user/{owner.id}", headers=other_headers)
    assert forbidden_delete.status_code == 403


def test_register_rejects_weak_password(client):
    weak = _register_user(client, email="weak@example.com", password="weakpass")
    assert weak.status_code == 400
    assert "Password must be" in weak.json()["detail"]

