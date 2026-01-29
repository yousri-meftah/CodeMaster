from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from app.controllers.auth import get_current_user

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
def get_progress(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    return {
        "problemsSolved": 0,
        "articlesRead": 0,
        "streak": 0,
        "roadmapProgress": "{}",
        "lastActive": None,
    }


@router.post("/roadmap", status_code=status.HTTP_200_OK)
def update_roadmap_progress(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return {
        "status": "ok",
        "data": payload,
    }
