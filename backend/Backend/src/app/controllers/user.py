from sqlalchemy.orm import Session
from ..models import User
from ..services.auth import hash_password , verify_password, create_access_token
from ..schemas.user import UserCreate,UserResponse
from ..schemas.auth import UserLogin
from fastapi.security import OAuth2PasswordRequestForm
from app.exceptions.user import UserNotFoundException
from app.exceptions.user import UserEmailAlreadyExistsException
from app.exceptions.base import NotFoundException
from app.schemas.user import UserUpdate
from app.services.auth import hash_password

def register_user(user: UserCreate, db: Session):
    if db.query(User).filter(User.email == user.email).first():
        raise UserEmailAlreadyExistsException

    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        password=hashed_password
    )
    db.add(db_user)


def authenticate_user(user_login: OAuth2PasswordRequestForm, db: Session):
    user = db.query(User).filter(User.email == user_login.username).first()
    if not user:
        raise UserNotFoundException

    if not verify_password(user_login.password, user.password):
        raise UserNotFoundException

    access_token = create_access_token(data={"sub": user.id})

    return {"access_token": access_token, "token_type": "bearer"}



async def get_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException(detail="User not found")
    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
    }
    
    return user

async def update_user(user_id: int, user_data: UserUpdate, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException(detail="User not found")

    if user_data.password:
        user_data.password = hash_password(user_data.password)

    for key, value in user_data.dict(exclude_unset=True).items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user

async def delete_user(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException(detail="User not found")

    db.delete(user)
    db.commit()

def get_users(db: Session):
    try:
        result = db.query(User).all()
    except Exception as e:
        print(e)
        raise NotFoundException(detail="User not found")
    return result
    

