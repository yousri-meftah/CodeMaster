from dataclasses import dataclass

from fastapi import HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.models import RefreshToken, User
from app.schemas.auth import AuthPrincipal
from app.services.auth import (
    build_cookie_max_age_days,
    build_cookie_max_age_minutes,
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    refresh_token_expiry,
    utcnow,
)
from config import settings


@dataclass
class AuthSessionResult:
    principal: AuthPrincipal
    requires_role_selection: bool = False


def build_principal(*, user: User, session_id: str, auth_provider: str) -> AuthPrincipal:
    token, expires_at = create_access_token(
        claims={
            "sub": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_admin": bool(user.is_admin),
            "auth_provider": auth_provider,
            "session_id": session_id,
            "token_version": user.token_version,
        }
    )
    principal = AuthPrincipal(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_admin=bool(user.is_admin),
        auth_provider=auth_provider,
        session_id=session_id,
        token_version=user.token_version,
        issued_at=utcnow(),
        expires_at=expires_at,
    )
    principal.__dict__["_access_token"] = token
    return principal


def _cookie_options() -> dict:
    samesite = settings.AUTH_COOKIE_SAMESITE
    if samesite:
        samesite = samesite.capitalize()
    return {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": samesite or "Strict",
        "domain": settings.AUTH_COOKIE_DOMAIN,
        "path": settings.AUTH_COOKIE_PATH,
    }


def set_auth_cookies(*, response: Response, access_token: str, refresh_token: str) -> None:
    options = _cookie_options()
    response.set_cookie(
        settings.ACCESS_TOKEN_COOKIE_NAME,
        access_token,
        max_age=build_cookie_max_age_minutes(settings.ACCESS_TOKEN_EXPIRES_MINUTES),
        **options,
    )
    response.set_cookie(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        refresh_token,
        max_age=build_cookie_max_age_days(settings.REFRESH_TOKEN_EXPIRES_DAYS),
        **options,
    )


def clear_auth_cookies(response: Response) -> None:
    options = _cookie_options()
    response.delete_cookie(settings.ACCESS_TOKEN_COOKIE_NAME, domain=options["domain"], path=options["path"])
    response.delete_cookie(settings.REFRESH_TOKEN_COOKIE_NAME, domain=options["domain"], path=options["path"])


def create_user_session(
    *,
    db: Session,
    user: User,
    response: Response,
    request: Request,
    auth_provider: str,
    requires_role_selection: bool = False,
) -> AuthSessionResult:
    raw_refresh_token = generate_refresh_token()
    refresh_row = RefreshToken(
        user_id=user.id,
        session_id=generate_refresh_token()[:32],
        token_hash=hash_refresh_token(raw_refresh_token),
        auth_provider=auth_provider,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=refresh_token_expiry(),
    )
    db.add(refresh_row)
    db.flush()
    principal = build_principal(user=user, session_id=refresh_row.session_id, auth_provider=auth_provider)
    set_auth_cookies(
        response=response,
        access_token=principal.__dict__.pop("_access_token"),
        refresh_token=raw_refresh_token,
    )
    db.commit()
    return AuthSessionResult(principal=principal, requires_role_selection=requires_role_selection)


def _load_refresh_token(db: Session, raw_token: str) -> RefreshToken:
    token_hash = hash_refresh_token(raw_token)
    refresh_row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if not refresh_row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if refresh_row.revoked_at:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")
    expires_at = refresh_row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=utcnow().tzinfo)
    if expires_at <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    return refresh_row


def refresh_user_session(*, db: Session, request: Request, response: Response) -> AuthSessionResult:
    raw_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    current = _load_refresh_token(db, raw_token)
    user = db.query(User).filter(User.id == current.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    new_raw_token = generate_refresh_token()
    replacement = RefreshToken(
        user_id=user.id,
        session_id=current.session_id,
        token_hash=hash_refresh_token(new_raw_token),
        auth_provider=current.auth_provider,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=refresh_token_expiry(),
    )
    db.add(replacement)
    db.flush()
    current.revoked_at = utcnow()
    current.last_used_at = utcnow()
    current.replaced_by_id = replacement.id
    principal = build_principal(user=user, session_id=current.session_id, auth_provider=current.auth_provider)
    set_auth_cookies(
        response=response,
        access_token=principal.__dict__.pop("_access_token"),
        refresh_token=new_raw_token,
    )
    db.commit()
    return AuthSessionResult(principal=principal)


def logout_user_session(*, db: Session, request: Request, response: Response) -> None:
    raw_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    if raw_token:
        refresh_row = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(raw_token)).first()
        if refresh_row and not refresh_row.revoked_at:
            refresh_row.revoked_at = utcnow()
            refresh_row.last_used_at = utcnow()
            db.commit()
    clear_auth_cookies(response)
