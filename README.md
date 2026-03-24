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
- `deploy/`: production nginx + monitoring configs.
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

## One-Command Production Stack

From project root:

```bash
make prod-up
```

This starts:
- frontend (built and served by nginx)
- backend (with migrations on startup)
- postgres
- prometheus
- grafana

Useful endpoints after startup:
- app: `http://localhost`
- backend health: `http://localhost/healthz`
- prometheus: `http://localhost:9090`
- grafana: `http://localhost:3001` (admin/admin)

