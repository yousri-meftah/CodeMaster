import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from api import auth ,user , Tag , SavedSolution,Roadmap , Problem , Comment, Progress, Article, Submission, Interviews, Interview 
from app.services.admin_bootstrap import bootstrap_admin
from config import settings
from database import SessionLocal

try:
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:  # optional in local environments without network install
    Instrumentator = None

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.R2_BUCKET:
        Path(settings.INTERVIEW_MEDIA_UPLOAD_ROOT).mkdir(parents=True, exist_ok=True)
    app.state.frontend_callback_url = f"{settings.OAUTH_FRONTEND_BASE_URL.rstrip('/')}{settings.OAUTH_FRONTEND_CALLBACK_PATH}"
    db = SessionLocal()
    try:
        status = bootstrap_admin(db)
        logger.info("Admin bootstrap %s", status)
    except Exception as exc:
        logger.error("Admin bootstrap failed: %s", exc)
        raise
    finally:
        db.close()
    yield


app = FastAPI(
    title='PointOfSell',
    description='FastApi PointOfSell Project',
    version='1.0.0',
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(Tag.router, prefix="/tag", tags=["tag"])
app.include_router(Problem.router, prefix="/problem", tags=["problem"])
app.include_router(SavedSolution.router, prefix="/saved-solution", tags=["saved-solution"])
app.include_router(SavedSolution.router, prefix="/SavedSolution", tags=["SavedSolution"])
app.include_router(Roadmap.router, prefix="/roadmap", tags=["roadmap"])
app.include_router(Comment.router, prefix="/comment", tags=["comment"])
app.include_router(Progress.router, prefix="/progress", tags=["progress"])
app.include_router(Article.router, prefix="/articles", tags=["articles"])
app.include_router(Submission.router, prefix="/submission", tags=["submission"])
app.include_router(Interviews.router, prefix="/interviews", tags=["interviews"])
app.include_router(Interview.router, prefix="/interview", tags=["interview"])

@app.get("/healthz", include_in_schema=False)
def healthz():
    return JSONResponse({"status": "ok"})


if Instrumentator is not None:
    Instrumentator().instrument(app).expose(app, include_in_schema=False, endpoint="/metrics")




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
