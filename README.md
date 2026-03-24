# CodeMaster

CodeMaster is a full-stack coding practice platform inspired by LeetCode. Users can browse problems, solve them in an online editor, submit solutions, and track progress. It also includes recruiter-managed interview flows.

## Project Layout

- `client/`: the React + Vite frontend.
- `backend/`: the FastAPI backend project.
- `backend/src/`: backend application code.
- `backend/tests/`: backend tests.
- `backend/migrations/`: Alembic migrations.
- `backend/docker/`: Dockerfiles and entrypoint scripts.
- `client/src/types/`: frontend-only shared types.
- `docs/`: planning and project notes.

## Local Run Commands

### Frontend

```bash
cd client
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn src.main:app --reload
```


