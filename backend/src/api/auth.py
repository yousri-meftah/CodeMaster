from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.auth import  UserLogin, Token
from app.schemas.user import UserCreate
from database import get_db
from app.controllers.user import register_user, authenticate_user
from app.schemas.auth import register_return
from app.exceptions.user import UserEmailAlreadyExistsException,UserNotFoundException
from app.controllers.auth import get_current_user
from app.services.rate_limiter import rate_limit_from_setting
from fastapi.security import OAuth2PasswordRequestForm
from schemas import *
router = APIRouter()


#needed later userr = Depends(get_current_user)

@router.post(
    "/register",
    response_model=register_return,
    dependencies=[Depends(rate_limit_from_setting("RATE_LIMIT_AUTH_REGISTER", "auth:register"))],
)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        register_user(user, db)
    except UserEmailAlreadyExistsException:
        return register_return(status="error", message="Email already exists")
    db.commit()
    return register_return(status="success", message="User created successfully")


@router.post(
    "/login",
    response_model=Token,
    dependencies=[Depends(rate_limit_from_setting("RATE_LIMIT_AUTH_LOGIN", "auth:login"))],
)
async def login(data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        Token_return = authenticate_user(data,db)
    except UserNotFoundException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
    return Token_return

@router.get("/me", response_model=UserOut)
def get_me(current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    return current_user
