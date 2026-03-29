import os
import shutil

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_REQUIRED_ENV_DEFAULTS = {
    "REDIS_URL": "redis://localhost:6379/0",
    "MAIL_USERNAME": "test@example.com",
    "MAIL_PASSWORD": "test",
    "MAIL_FROM": "test@example.com",
    "MAIL_PORT": "587",
    "MAIL_SERVER": "smtp.example.com",
    "MAIL_FROM_NAME": "test",
    "SECRET_KEY": "test-secret-key",
    "JWT_ALGORITHM": "HS256",
    "JWT_EXPIRATION_MINUETS": "60",
    "ACCESS_TOKEN_EXPIRES_MINUTES": "15",
    "REFRESH_TOKEN_EXPIRES_DAYS": "14",
    "JWT_ISSUER": "codemaster-backend",
    "JWT_AUDIENCE": "codemaster-web",
    "ACCESS_TOKEN_COOKIE_NAME": "access_token",
    "REFRESH_TOKEN_COOKIE_NAME": "refresh_token",
    "AUTH_COOKIE_SECURE": "false",
    "AUTH_COOKIE_SAMESITE": "strict",
    "AUTH_COOKIE_PATH": "/",
    "CODE_EXPIRATION_MINUTES": "5",
    "POSTGRES_URL": "sqlite+pysqlite:///:memory:",
    "POSTGRES_DB": "test_db",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "POSTGRES_HOST": "localhost",
    "RATE_LIMIT_ENABLED": "false",
    "ADMIN_BOOTSTRAP_ENABLED": "false",
    "OAUTH_FRONTEND_CALLBACK_PATH": "/auth/callback",
    "OAUTH_FRONTEND_BASE_URL": "http://localhost:5173",
    "OAUTH_BACKEND_BASE_URL": "http://localhost:8000",
    "GOOGLE_OAUTH_CLIENT_ID": "google-client-id",
    "GOOGLE_OAUTH_CLIENT_SECRET": "google-client-secret",
    "GITHUB_OAUTH_CLIENT_ID": "github-client-id",
    "GITHUB_OAUTH_CLIENT_SECRET": "github-client-secret",
    "INTERVIEW_MEDIA_UPLOAD_ROOT": os.path.join(os.getcwd(), "test_uploads"),
    "R2_ACCOUNT_ID": "",
    "R2_BUCKET": "",
    "R2_ACCESS_KEY_ID": "",
    "R2_SECRET_ACCESS_KEY": "",
    "R2_ENDPOINT_URL": "",
    "R2_REGION": "auto",
    "R2_PRESIGNED_URL_TTL_SECONDS": "3600",
}

for key, value in _REQUIRED_ENV_DEFAULTS.items():
    os.environ[key] = value

from app.models import Base
from database import get_db
from main import app


TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+pysqlite:///:memory:")
TEST_UPLOAD_ROOT = os.environ["INTERVIEW_MEDIA_UPLOAD_ROOT"]

connect_args = {}
if TEST_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(TEST_DATABASE_URL, connect_args=connect_args)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    shutil.rmtree(TEST_UPLOAD_ROOT, ignore_errors=True)


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
