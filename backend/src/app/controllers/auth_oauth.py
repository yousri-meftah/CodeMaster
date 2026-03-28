from dataclasses import dataclass
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.controllers.auth_session import AuthSessionResult, create_user_session
from app.models import OAuthAccount, User
from app.services.auth import create_state_token, decode_state_token
from config import settings


@dataclass(frozen=True)
class OAuthProviderConfig:
    name: str
    auth_url: str
    token_url: str
    userinfo_url: str
    email_url: str | None
    client_id: str
    client_secret: str
    scopes: str


def _provider_config(provider: str) -> OAuthProviderConfig:
    configs = {
        "google": OAuthProviderConfig(
            name="google",
            auth_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            email_url=None,
            client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
            client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
            scopes="openid email profile",
        ),
        "github": OAuthProviderConfig(
            name="github",
            auth_url="https://github.com/login/oauth/authorize",
            token_url="https://github.com/login/oauth/access_token",
            userinfo_url="https://api.github.com/user",
            email_url="https://api.github.com/user/emails",
            client_id=settings.GITHUB_OAUTH_CLIENT_ID,
            client_secret=settings.GITHUB_OAUTH_CLIENT_SECRET,
            scopes="read:user user:email",
        ),
    }
    config = configs.get(provider)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported OAuth provider")
    if not config.client_id or not config.client_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"{provider.capitalize()} OAuth is not configured")
    return config


def _callback_url(provider: str) -> str:
    return f"{settings.OAUTH_BACKEND_BASE_URL.rstrip('/')}/auth/oauth/{provider}/callback"


def build_authorization_url(provider: str) -> str:
    config = _provider_config(provider)
    state = create_state_token(provider=provider)
    params = {
        "client_id": config.client_id,
        "redirect_uri": _callback_url(provider),
        "response_type": "code",
        "scope": config.scopes,
        "state": state,
    }
    if provider == "github":
        params["allow_signup"] = "true"
    return f"{config.auth_url}?{urlencode(params)}"


async def _exchange_code(provider: str, code: str) -> str:
    config = _provider_config(provider)
    payload = {
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "code": code,
        "redirect_uri": _callback_url(provider),
    }
    if provider == "google":
        payload["grant_type"] = "authorization_code"
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(config.token_url, data=payload, headers=headers)
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = response.text
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"{provider.capitalize()} OAuth token exchange failed: {detail}",
            ) from exc
        body = response.json()
    token = body.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="OAuth token exchange failed")
    return token


async def _load_provider_profile(provider: str, access_token: str) -> dict:
    config = _provider_config(provider)
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=15) as client:
        profile_response = await client.get(config.userinfo_url, headers=headers)
        profile_response.raise_for_status()
        profile = profile_response.json()
        if provider == "github" and config.email_url:
            email_response = await client.get(config.email_url, headers=headers)
            email_response.raise_for_status()
            emails = email_response.json()
            primary_verified = next((item for item in emails if item.get("primary") and item.get("verified")), None)
            fallback_verified = next((item for item in emails if item.get("verified")), None)
            chosen = primary_verified or fallback_verified
            profile["email"] = profile.get("email") or (chosen or {}).get("email")
    return profile


def _resolve_profile_identity(provider: str, profile: dict) -> tuple[str, str, str | None]:
    if provider == "google":
        provider_user_id = str(profile.get("sub") or "")
        email = profile.get("email")
        username = profile.get("name") or profile.get("given_name") or email
    else:
        provider_user_id = str(profile.get("id") or "")
        email = profile.get("email")
        username = profile.get("login") or profile.get("name") or email

    if not provider_user_id or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth provider did not return a verified email")
    return provider_user_id, email.lower(), username


async def complete_oauth_login(
    *,
    provider: str,
    code: str,
    state: str,
    db: Session,
    request: Request,
    response: Response,
) -> AuthSessionResult:
    decode_state_token(state, provider)
    provider_access_token = await _exchange_code(provider, code)
    profile = await _load_provider_profile(provider, provider_access_token)
    provider_user_id, email, username = _resolve_profile_identity(provider, profile)

    account = (
        db.query(OAuthAccount)
        .filter(OAuthAccount.provider == provider, OAuthAccount.provider_user_id == provider_user_id)
        .first()
    )
    requires_role_selection = False
    if account:
        user = account.user
        account.provider_email = email
        account.provider_username = username
    else:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=username or email.split("@")[0],
                email=email,
                password=None,
                role="user",
                is_admin=False,
            )
            db.add(user)
            db.flush()
            requires_role_selection = True
        account = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            provider_email=email,
            provider_username=username,
        )
        db.add(account)
        db.flush()
    return create_user_session(
        db=db,
        user=user,
        response=response,
        request=request,
        auth_provider=provider,
        requires_role_selection=requires_role_selection,
    )


def apply_social_role_selection(*, user_id: int, role: str, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if role not in {"user", "recruiter"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user.role = role
    db.commit()
    db.refresh(user)
    return user
