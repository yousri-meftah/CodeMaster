from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RegisterReturn(BaseModel):
    status: str
    message: str


class AuthPrincipal(BaseModel):
    id: int
    email: EmailStr
    name: str
    role: str
    is_admin: bool = False
    auth_provider: str = "local"
    session_id: str | None = None
    token_version: int = 0
    issued_at: datetime | None = None
    expires_at: datetime | None = None

    model_config = ConfigDict(extra="forbid")


class AuthResponse(BaseModel):
    token_type: Literal["bearer"] = "bearer"
    user: AuthPrincipal
    requires_role_selection: bool = False


class OAuthStartResponse(BaseModel):
    authorization_url: str
    provider: Literal["google", "github"]


class SocialRoleSelectionIn(BaseModel):
    role: Literal["user", "recruiter"]


class MediaPolicyEventIn(BaseModel):
    token: str
    event_type: str
    detail: str | None = None
