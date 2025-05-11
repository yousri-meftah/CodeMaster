from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from schemas import *
from app.models import *
from database import get_db
from app.controllers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=CommentOut)
def post_comment(data: CommentIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        comment = Comment(user_id=user.id, problem_id=data.problem_id, content=data.content)
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/problem/{problem_id}", response_model=List[CommentOut])
def get_comments(problem_id: int, db: Session = Depends(get_db)):
    try:
        return db.query(Comment).filter_by(problem_id=problem_id).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
