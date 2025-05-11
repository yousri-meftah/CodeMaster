from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from schemas import *
from app.models import *
from database import get_db 
from app.controllers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=SavedSolutionOut)
def save_solution(data: SavedSolutionIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        existing = db.query(SavedSolution).filter_by(user_id=user.id, problem_id=data.problem_id).first()
        if existing:
            existing.code = data.code
            existing.timestamp = datetime.utcnow()
        else:
            existing = SavedSolution(user_id=user.id, problem_id=data.problem_id, code=data.code)
            db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[SavedSolutionOut])
def get_my_solutions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        return db.query(SavedSolution).filter_by(user_id=user.id).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
