from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from redis.asyncio import Redis
from database import get_db
from redis_db import get_redis
from app.schemas.user import UserCreate, UserUpdate, UserResponse, Users
from app.controllers.user import register_user, get_user, update_user, delete_user, get_users
from app.controllers.auth import get_current_user
from sqlalchemy import func
from app.models import SavedSolution
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

@router.get("/solutions")
def get_user_solutions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

        solutions = (
            db.query(SavedSolution)
            .filter(SavedSolution.user_id == user.id)
            .order_by(SavedSolution.timestamp.desc())
            .all()
        )

        return [
            {
                "id": solution.id,
                "userId": solution.user_id,
                "problemId": solution.problem_id,
                "code": solution.code,
                "language": "javascript",
                "solved": False,
                "favorite": False,
                "createdAt": solution.timestamp,
                "updatedAt": solution.timestamp,
            }
            for solution in solutions
        ]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )

@router.get("/activity")
def get_user_activity(db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

        rows = (
            db.query(func.date(SavedSolution.timestamp).label("day"), func.count(SavedSolution.id))
            .filter(SavedSolution.user_id == user.id)
            .group_by(func.date(SavedSolution.timestamp))
            .order_by(func.date(SavedSolution.timestamp))
            .all()
        )

        return [{"date": str(day), "count": count} for day, count in rows]
    except HTTPException:
        raise
    except Exception:
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
