from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from schemas import *
from app.models import *
from database import get_db
from app.controllers.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=TagOut)
def create_tag(data: TagIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        tag = Tag(name=data.name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[TagOut])
def get_tags(db: Session = Depends(get_db)):
    try:
        return db.query(Tag).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
