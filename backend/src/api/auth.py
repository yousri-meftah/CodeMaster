from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.controllers.auth import require_user
from app.controllers.auth_local import authenticate_local_user, register_user_account
from app.controllers.auth_oauth import apply_social_role_selection, build_authorization_url, complete_oauth_login
from app.controllers.auth_session import clear_auth_cookies, create_user_session, logout_user_session, refresh_user_session
from app.exceptions.user import UserEmailAlreadyExistsException, UserNotFoundException
from app.schemas.auth import SocialRoleSelectionIn
from app.schemas.user import UserCreate
from app.services.rate_limiter import rate_limit_from_setting
from database import get_db
from schemas import AuthResponseOut, OAuthStartOut, UserOut

router = APIRouter()


def _auth_response(result) -> dict:
    return {
        "token_type": "bearer",
        "user": {
            "id": result.principal.id,
            "name": result.principal.name,
            "email": result.principal.email,
            "phone": None,
            "is_admin": result.principal.is_admin,
            "role": result.principal.role,
            "auth_provider": result.principal.auth_provider,
            "session_id": result.principal.session_id,
            "token_version": result.principal.token_version,
            "issued_at": result.principal.issued_at,
            "expires_at": result.principal.expires_at,
        },
        "requires_role_selection": result.requires_role_selection,
    }


@router.post("/register", response_model=AuthResponseOut)
def register(
    user: UserCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_from_setting("RATE_LIMIT_AUTH_REGISTER", "auth:register")),
):
    try:
        result = register_user_account(user, db, request, response)
        return _auth_response(result)
    except UserEmailAlreadyExistsException:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    except HTTPException:
        raise
    except Exception:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/login", response_model=AuthResponseOut)
async def login(
    request: Request,
    response: Response,
    data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_from_setting("RATE_LIMIT_AUTH_LOGIN", "auth:login")),
):
    try:
        result = authenticate_local_user(data, db, request, response)
        return _auth_response(result)
    except UserNotFoundException:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/me", response_model=UserOut)
def get_me(current_user=Depends(require_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": None,
        "is_admin": current_user.is_admin,
        "role": current_user.role,
        "auth_provider": current_user.auth_provider,
        "session_id": current_user.session_id,
        "token_version": current_user.token_version,
        "issued_at": current_user.issued_at,
        "expires_at": current_user.expires_at,
    }


@router.post("/refresh", response_model=AuthResponseOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        result = refresh_user_session(db=db, request=request, response=response)
        return _auth_response(result)
    except HTTPException:
        clear_auth_cookies(response)
        raise


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    logout_user_session(db=db, request=request, response=response)


@router.get("/oauth/{provider}/start", response_model=OAuthStartOut)
def oauth_start(provider: str):
    return {"provider": provider, "authorization_url": build_authorization_url(provider)}


@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: str, code: str, state: str, request: Request, response: Response, db: Session = Depends(get_db)):
    result = await complete_oauth_login(provider=provider, code=code, state=state, db=db, request=request, response=response)
    redirect_target = (
        f"{request.app.state.frontend_callback_url}"
        f"?provider={provider}&requires_role_selection={'1' if result.requires_role_selection else '0'}"
    )
    redirect = RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)
    for header, value in response.raw_headers:
        if header.decode("latin-1").lower() == "set-cookie":
            redirect.raw_headers.append((header, value))
    return redirect


@router.post("/social-role", response_model=AuthResponseOut)
def social_role_selection(
    payload: SocialRoleSelectionIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user=Depends(require_user),
):
    updated = apply_social_role_selection(user_id=user.id, role=payload.role, db=db)
    result = create_user_session(db=db, user=updated, response=response, request=request, auth_provider=user.auth_provider)
    return _auth_response(result)
