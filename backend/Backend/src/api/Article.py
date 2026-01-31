from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from app.controllers.auth import get_current_user
from app.models import Article
from schemas import ArticleIn, ArticleOut

router = APIRouter()


@router.post("/", response_model=ArticleOut)
def create_article(data: ArticleIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        article = Article(
            title=data.title,
            content=data.content,
            summary=data.summary,
            image_url=data.image_url,
            author=data.author,
            read_time=data.read_time,
            categories=data.categories,
        )
        db.add(article)
        db.commit()
        db.refresh(article)
        return article
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[ArticleOut])
def list_articles(db: Session = Depends(get_db), category: Optional[str] = None):
    try:
        query = db.query(Article)
        if category:
            query = query.filter(Article.categories.contains([category]))
        return query.order_by(Article.created_at.desc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    try:
        article = db.query(Article).get(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        return article
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{article_id}", response_model=ArticleOut)
def update_article(article_id: int, data: ArticleIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        article = db.query(Article).get(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        article.title = data.title
        article.content = data.content
        article.summary = data.summary
        article.image_url = data.image_url
        article.author = data.author
        article.read_time = data.read_time
        article.categories = data.categories
        db.commit()
        db.refresh(article)
        return article
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        article = db.query(Article).get(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        db.delete(article)
        db.commit()
        return {"detail": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
