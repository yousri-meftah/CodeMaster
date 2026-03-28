from sqlalchemy.orm import Session
from ..models import User
from ..services.auth import hash_password, is_password_strong_enough
from ..schemas.user import UserCreate,UserResponse
from app.exceptions.user import UserEmailAlreadyExistsException
from app.exceptions.base import NotFoundException
from app.schemas.user import UserUpdate
from fastapi import HTTPException, status

def register_user(user: UserCreate, db: Session):
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

    hashed_password = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        password=hashed_password,
        role=role,
        is_admin=False,
    )
    db.add(db_user)
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
        if not is_password_strong_enough(user_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters and include upper, lower, digit, and special character",
            )
        user_data.password = hash_password(user_data.password)

    for key, value in user_data.model_dump(exclude_unset=True).items():
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
    

