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


def test_register_login_and_me(client):
    register = _register_user(client)
    assert register.status_code == 200
    assert register.json()["status"] == "success"

    login = _login_user(client)
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "test@example.com"
