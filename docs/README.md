# CodeMaster — Project Notes

## What this project is
Full-stack coding practice platform. Backend is FastAPI + PostgreSQL with SQLAlchemy/Alembic and JWT auth.

## Tech stack
Frontend
- React (Vite) + TypeScript
- Wouter routing
- TanStack Query
- Tailwind + shadcn
- CodeMirror

Backend
- FastAPI
- SQLAlchemy ORM + Alembic
- PostgreSQL
- Redis
- JWT auth (OAuth2 password flow)

## Repo structure (high level)
- `client/` — React frontend
- `backend/Backend/` — FastAPI backend (source in `backend/Backend/src/`)
- `shared/` — TypeScript types/schema
- `backend/docker-compose.dev.yml` — dev stack
- `backend/docker-compose.prod.yml` — prod stack

## Backend features (API)
FastAPI app is configured in `backend/Backend/src/main.py`.

Auth
- `POST /auth/register` — register user
- `POST /auth/login` — login, returns JWT
- `GET /auth/me` — current user

Users
- `POST /user/` — create user
- `GET /user/{user_id}` — get user
- `GET /user/` — list users
- `PUT /user/{user_id}` — update user
- `DELETE /user/{user_id}` — delete user
- `GET /user/activity` — activity counts by day
- `GET /user/solutions` — user solutions

Tags
- `POST /tag/` — create tag
- `GET /tag/` — list tags

Problems
- `POST /problem/` — create problem
- `GET /problem/` — list problems with filters (difficulty, name)
- `GET /problem/daily` — daily problem
- `GET /problem/{problem_id}` — get problem
- `PUT /problem/{problem_id}` — update
- `DELETE /problem/{problem_id}` — delete

Saved solutions
- `POST /saved-solution/` — save or update solution
- `GET /saved-solution/{problem_id}` — current user’s solution for a problem

Roadmaps
- `POST /roadmap/` — create roadmap
- `GET /roadmap/` — list roadmaps
- `PUT /roadmap/{roadmap_id}` — update roadmap
- `DELETE /roadmap/{roadmap_id}` — delete roadmap

Comments
- `POST /comment/` — add comment
- `GET /comment/problem/{problem_id}` — list comments for a problem

## Data model (backend)
Core tables (SQLAlchemy models in `backend/Backend/src/app/models/`):
- `users`
- `problems`
- `problem_test_cases`
- `problem_starter_code`
- `tags` and `problem_tags`
- `roadmaps` and `roadmap_problems`
- `saved_solutions`
- `comments`

## Running locally
Backend
- Dev: `backend/docker-compose.dev.yml`
- Prod: `backend/docker-compose.prod.yml`
- Env files: `backend/Backend/envs/backend.env` and `backend/Backend/envs/pg.env`
- Examples: `backend/Backend/envs/example.env` and `backend/Backend/envs/pg_example.env`

## Testing
API-level tests live in `backend/Backend/tests`.
CI uses a separate Postgres test database.
