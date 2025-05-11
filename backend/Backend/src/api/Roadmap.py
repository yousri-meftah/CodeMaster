from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from schemas import *
from app.models import *
from database import get_db
from app.controllers.auth import get_current_user


router = APIRouter()

@router.post("/", response_model=RoadmapOut)
def create_roadmap(data: RoadmapIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        roadmap = Roadmap(title=data.title)
        db.add(roadmap)
        db.commit()
        for idx, pid in enumerate(data.problem_ids_ordered):
            link = RoadmapProblem(roadmap_id=roadmap.id, problem_id=pid, order=idx)
            db.add(link)
        db.commit()
        db.refresh(roadmap)
        return roadmap
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[RoadmapOut])
def list_roadmaps(db: Session = Depends(get_db)):
    try:
        roadmaps = db.query(Roadmap).all()
        result = []
        for r in roadmaps:
            problem_ids = [link.problem_id for link in sorted(r.problems, key=lambda x: x.order)]
            result.append(RoadmapOut(id=r.id, title=r.title, problem_ids_ordered=problem_ids))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
