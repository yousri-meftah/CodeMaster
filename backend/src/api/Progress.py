from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.controllers.auth import get_current_user
from app.models import Submission
from database import get_db

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
def get_progress(db: Session = Depends(get_db), user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    solved_count = (
        db.query(func.count(func.distinct(Submission.problem_id)))
        .filter(
            Submission.user_id == user.id,
            Submission.is_submit.is_(True),
            Submission.verdict == "AC",
        )
        .scalar()
        or 0
    )

    rows = (
        db.query(func.date(Submission.created_at).label("day"))
        .filter(
            Submission.user_id == user.id,
            Submission.is_submit.is_(True),
            Submission.verdict == "AC",
        )
        .group_by(func.date(Submission.created_at))
        .all()
    )
    activity_days = {row.day for row in rows if row.day}
    streak = 0
    today = datetime.utcnow().date()
    current = today
    while current in activity_days:
        streak += 1
        current -= timedelta(days=1)

    return {
        "problemsSolved": solved_count,
        "articlesRead": 0,
        "streak": streak,
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
