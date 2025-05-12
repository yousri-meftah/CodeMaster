from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.auth import  UserLogin, Token
from app.schemas.user import UserCreate
from database import get_db
from app.controllers.user import register_user, authenticate_user
from app.schemas.auth import register_return
from app.exceptions.user import UserEmailAlreadyExistsException,UserNotFoundException
from app.controllers.auth import get_current_user
from fastapi.security import OAuth2PasswordRequestForm
from schemas import *
router = APIRouter()


#needed later userr = Depends(get_current_user)

@router.post("/register", response_model=register_return)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        register_user(user, db)
    except UserEmailAlreadyExistsException:
        return register_return(status="error", message="Email already exists")
    db.commit()
    return register_return(status="success", message="User created successfully")


@router.post("/login", response_model=Token)
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
    print("cur = ",current_user.__dict__)
    return UserOut(**current_user.__dict__)