from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from api import auth ,user , Tag , SavedSolution,Roadmap , Problem , Comment, Progress 

app = FastAPI(
    title='PointOfSell',
    description='FastApi PointOfSell Project',
    version='1.0.0',
    docs_url='/',
)
origins = [
    "*",
    "http://localhost",
    "http://localhost:3000",
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
app.include_router(SavedSolution.router, prefix="/SavedSolution", tags=["SavedSolution"])
app.include_router(Roadmap.router, prefix="/roadmap", tags=["roadmap"])
app.include_router(Comment.router, prefix="/comment", tags=["comment"])
app.include_router(Progress.router, prefix="/progress", tags=["progress"])




if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
