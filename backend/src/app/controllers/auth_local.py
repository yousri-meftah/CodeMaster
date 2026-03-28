from fastapi import HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.controllers.auth_session import AuthSessionResult, create_user_session
from app.exceptions.user import UserEmailAlreadyExistsException, UserNotFoundException
from app.models import User
from app.schemas.user import UserCreate
from app.services.auth import hash_password, is_password_strong_enough, verify_password


def register_user_account(user: UserCreate, db: Session, request: Request, response: Response) -> AuthSessionResult:
    if db.query(User).filter(User.email == user.email).first():
        raise UserEmailAlreadyExistsException

    if not is_password_strong_enough(user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and include upper, lower, digit, and special character",
        )

    role = (user.role or "user").strip().lower()
    if role not in {"user", "recruiter"}:
        role = "user"

    db_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        password=hash_password(user.password),
        role=role,
        is_admin=False,
    )
    db.add(db_user)
    db.flush()
    return create_user_session(db=db, user=db_user, response=response, request=request, auth_provider="local")


def authenticate_local_user(
    credentials: OAuth2PasswordRequestForm,
    db: Session,
    request: Request,
    response: Response,
) -> AuthSessionResult:
    user = db.query(User).filter(User.email == credentials.username).first()
    if not user or not verify_password(credentials.password, user.password):
        raise UserNotFoundException
    return create_user_session(db=db, user=user, response=response, request=request, auth_provider="local")
