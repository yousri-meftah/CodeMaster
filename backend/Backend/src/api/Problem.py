from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from schemas import *
from app.models import *
from database import get_db
from app.controllers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=ProblemOut)
def create_problem(data: ProblemIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
        problem = Problem(
            title=data.title,
            difficulty=data.difficulty,
            external_link=data.external_link,
            tags=tags
        )
        db.add(problem)
        db.commit()
        db.refresh(problem)
        return problem
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[ProblemOut])
def get_all_problems(db: Session = Depends(get_db)):
    try:
        return db.query(Problem).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{problem_id}", response_model=ProblemOut)
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    try:
        problem = db.query(Problem).get(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        return problem
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{problem_id}", response_model=ProblemOut)
def update_problem(problem_id: int, data: ProblemIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        problem = db.query(Problem).get(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        problem.title = data.title
        problem.difficulty = data.difficulty
        problem.external_link = data.external_link
        problem.tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
        db.commit()
        db.refresh(problem)
        return problem
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{problem_id}")
def delete_problem(problem_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        problem = db.query(Problem).get(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        db.delete(problem)
        db.commit()
        return {"detail": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
