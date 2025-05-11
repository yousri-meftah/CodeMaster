from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from redis.asyncio import Redis
from database import get_db
from redis_db import get_redis
from app.schemas.user import UserCreate, UserUpdate, UserResponse, Users
from app.controllers.user import register_user, get_user, update_user, delete_user, get_users
from app.exceptions.base import NotFoundException

router = APIRouter()

@router.post("/", response_model=UserResponse)
def create_user_api(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        return register_user(user_data, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_api(user_id: int, db: Session = Depends(get_db)):
    try:
        return await get_user(user_id, db)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )

@router.get("/", response_model=Users)
async def get_users_api(db: Session = Depends(get_db)):
    try:
        res = []
        result = get_users(db)

        for val in result:
            res.append(UserResponse(**val.__dict__))

        final_result = Users(data = res)
        return final_result
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )

@router.put("/{user_id}", response_model=UserResponse)
def update_user_api(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    try:
        return update_user(user_id, user_data, db)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_api(user_id: int, db: Session = Depends(get_db)):
    try:
        delete_user(user_id, db)
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
