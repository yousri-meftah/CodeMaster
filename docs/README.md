# CodeMaster (LeetCode-like practice platform) — Project Notes

## What this project is
A full‑stack coding practice platform inspired by LeetCode/NeetCode. Users browse problems, open a problem detail page with a code editor, and save solutions. The UI also includes articles, learning roadmaps, profile progress, and an admin dashboard for content management. The backend is FastAPI + PostgreSQL with SQLAlchemy/Alembic and JWT auth.

## Tech stack
Frontend
- React (Vite) + TypeScript
- Wouter routing
- TanStack Query for data fetching
- Tailwind + shadcn UI components
- CodeMirror editor

Backend
- FastAPI
- SQLAlchemy ORM + Alembic migrations
- PostgreSQL
- Redis (configured)
- JWT auth with OAuth2 password flow

## Repo structure (high level)
- `client/` — React frontend
- `backend/Backend/` — FastAPI backend (source in `backend/Backend/src/`)
- `shared/` — TypeScript types/schema (drizzle models used by frontend types)
- `backend/docker-compose.yaml` — local dev stack (backend + postgres + redis)
- `docs/NEXT_STEPS.md` — planned work (code execution, activity chart, daily problem)

## Frontend features (pages)
Routes are defined in `client/src/App.tsx`.

- `/` Home
  - Hero, featured categories, latest articles, stats
- `/problems` Problems list
  - Search + difficulty filter; shows difficulty badge + tags + external link
- `/problems/:id` Problem detail
  - Code editor (CodeMirror) + save solution
- `/explore` Articles list
- Explore lists articles from the backend; empty state prompts admin to add content.
- Article detail page renders only backend content (no static fallback).
- `/articles/:id` Article detail (bookmark/copy/share UI)
- `/roadmap` Roadmaps
  - Visual card‑based roadmap with resources and skills
- `/profile` Profile (protected)
  - Shows stats and tabs for solved/saved/favorites
- `/admin` Admin dashboard (protected)
  - CRUD UI for problems/articles/roadmaps
- `/auth` Login/Register

## Backend features (API)
FastAPI app is configured in `backend/Backend/src/main.py`.

Auth
- `POST /auth/register` — register user
- `POST /auth/login` — OAuth2 password login, returns JWT
- `GET /auth/me` — current user from token

Users
- `POST /user/` — create user
- `GET /user/{user_id}` — get user
- `GET /user/` — list users
- `PUT /user/{user_id}` — update user
- `DELETE /user/{user_id}` — delete user
- `GET /user/activity` — get activity counts by day (auth required)
- `GET /user/solutions` — get user saved solutions (auth required)

Tags
- `POST /tag/` — create tag (auth required)
- `GET /tag/` — list tags

Problems
- `POST /problem/` — create problem (auth required)
- `GET /problem/` — list problems with filters (difficulty, name)
- `GET /problem/daily` — get the daily problem
- `GET /problem/{problem_id}` — get problem
- `PUT /problem/{problem_id}` — update (auth required)
- `DELETE /problem/{problem_id}` — delete (auth required)
- Responses now include `description` and sample `test_cases` (hidden test cases are not returned).
- Responses now include `starter_codes` for each supported language.
- Responses include `constraints` (if present).

Saved solutions
- `POST /saved-solution/` — save or update solution (auth required)
- `GET /saved-solution/{problem_id}` — get current user’s solution for a problem (auth required)

Roadmaps
- `POST /roadmap/` — create roadmap (auth required)
- `GET /roadmap/` — list roadmaps
- `PUT /roadmap/{roadmap_id}` — update roadmap (auth required)
- `DELETE /roadmap/{roadmap_id}` — delete roadmap (auth required)

Comments
- `POST /comment/` — add comment (auth required)
- `GET /comment/problem/{problem_id}` — list comments for a problem

## Data model (backend)
Core tables (SQLAlchemy models in `backend/Backend/src/app/models/`):
- `users` — name, email, phone, password hash, is_admin
- `problems` — title, difficulty, external_link
- `problem_test_cases` — problem_id, input_text, output_text, is_sample, order
- `problem_starter_code` — problem_id, language, code
- `problems.constraints` — constraints text for runtime/limits documentation
- `tags` and `problem_tags` (many‑to‑many)
- `roadmaps` and `roadmap_problems` (ordered links)
- `saved_solutions` — user_id, problem_id, code, timestamp
- `comments` — user_id, problem_id, content
- `favorites` and `done_problems` (present in models but no API endpoints yet)

## Auth & roles
- JWT access token stored in localStorage by the frontend
- `use-auth` guard redirects non‑admins away from `/admin`
- Token expiration triggers logout + sign-in prompt (until refresh tokens are added)

## Running locally (current setup)
Backend
- Docker: `backend/docker-compose.yaml` starts backend + postgres + redis
- Env files expected by backend: `backend/Backend/envs/backend.env` and `backend/Backend/envs/pg.env`
  - Examples are in `backend/Backend/envs/example.env` and `backend/Backend/envs/pg_example.env`

Frontend
- `client/` is a Vite app (`npm install` then `npm run dev`)

## Important gaps / mismatches to be aware of
These matter for the upcoming work:

1) Frontend routes vs backend routes
- Frontend uses `/problems`, `/articles`, `/progress`, `/user/solutions` in several places.
- Backend serves `/problem`, `/roadmap`, `/comment`, `/saved-solution` and has no `/articles`, `/progress`, or `/user/solutions` endpoints yet.

2) Problem tags/category mismatch
- Backend returns `ProblemOut.tags` as objects (`{id, name}`), while the UI expects a string array (frontend maps these now).

3) Articles & progress
- UI has full pages for articles and roadmap progress, but backend has no models/endpoints for those features.

4) Admin UI creates problems with `externalUrl` and tags
- Backend expects `external_link` and tag ids (`tag_ids`); the admin UI now accepts tags and maps them to ids (creating missing tags).

5) Roadmap schema difference
- Backend roadmaps currently store only ordered problem ids; frontend steps/descriptions are placeholders until a richer schema is implemented.

6) Saved solutions
- Backend only stores `code` and timestamp; UI expects language and solved/favorite flags in profile.

## Status updates
- 2026-01-29: Added backend support for problem descriptions + test cases (DB migration + API).
- 2026-01-29: Added a data migration to seed descriptions/test cases for existing problems and insert a simple “Sum of Two Numbers” problem if missing.
- 2026-01-29: Added daily problem endpoint and starter code per language; frontend shows daily problem and loads starter code.
- 2026-01-29: Added daily problem icon in header and user activity heatmap.
- 2026-01-29: Added constraints field and seeded 10 test cases per problem for submission readiness.
- 2026-01-29: Explore and Article pages now rely on backend articles (no static fallback).
- 2026-01-29: Updated editor styling to a unique CodePractice look.
- 2026-01-29: Added syntax highlighting by language and improved Explore article detail.

## What this means for next steps
The frontend is feature‑complete in UI, but backend coverage is partial. The next development work will likely involve:
- Implementing missing endpoints (articles, progress, user solutions, favorites/done)
- Aligning request/response shapes between frontend and backend
- Normalizing naming/casing for routes (`/problem` vs `/problems`)
- Adding tag/category and roadmap step schemas consistently across both sides
Progress
- `GET /progress` — get user progress (auth required; placeholder)
- `POST /progress/roadmap` — update roadmap progress (auth required; placeholder)
