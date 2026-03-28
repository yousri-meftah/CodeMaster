from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.schemas.auth import AuthPrincipal
from app.services.auth import decode_access_token
from config import settings
from database import get_db
from app.models import User


def _to_datetime(value: int | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc)


def extract_access_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return token
    cookie_token = request.cookies.get(settings.ACCESS_TOKEN_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    return None


def principal_from_payload(payload: dict) -> AuthPrincipal:
    return AuthPrincipal(
        id=int(payload["sub"]),
        email=payload["email"],
        name=payload["name"],
        role=payload["role"],
        is_admin=bool(payload.get("is_admin", False)),
        auth_provider=payload.get("auth_provider", "local"),
        session_id=payload.get("session_id"),
        token_version=int(payload.get("token_version", 0)),
        issued_at=_to_datetime(payload.get("iat")),
        expires_at=_to_datetime(payload.get("exp")),
    )


def get_current_user(request: Request) -> AuthPrincipal | None:
    token = extract_access_token(request)
    if not token:
        return None
    payload = decode_access_token(token)
    return principal_from_payload(payload)


def require_user(user: AuthPrincipal | None = Depends(get_current_user)) -> AuthPrincipal:
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


def require_admin(user: AuthPrincipal = Depends(require_user)) -> AuthPrincipal:
    if user.is_admin or user.role == "admin":
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")


def require_recruiter(user: AuthPrincipal = Depends(require_user)) -> AuthPrincipal:
    if user.is_admin or user.role in {"admin", "recruiter"}:
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter only")


def get_current_db_user(
    principal: AuthPrincipal = Depends(require_user),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == principal.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user
