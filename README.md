# 🧠 Personal Coding Platform

Full‑stack coding practice platform inspired by LeetCode, built for structured learning, submissions, and analytics.

## ✨ Core Features
- Problem list with pagination, difficulty filters, tags, daily problem
- Problem detail page with description, examples, constraints, starter code
- Code execution (Piston) + Algo runner (custom `/execute`)
- Run vs Submit flows with verdict + per‑case results
- Submission history tab per problem
- Activity heatmap + solved list derived from accepted submissions
- Theme system + responsive UI

## 🖥️ Frontend (client/)
React + Vite UI that includes:
- Problems list + search + pagination
- Problem detail with editor, run/submit, submissions tab
- Profile with activity heatmap and solved list
- Explore/Articles and Roadmap pages

Editor preferences:
- Language preference saved in localStorage
- Code saved per problem + language in localStorage

## 🚀 Backend (backend/Backend/)
FastAPI + PostgreSQL + Alembic.

Key modules:
- `api/Problem.py` — problems + pagination + daily problem
- `api/Submission.py` — run/submit + submission history
- `api/user.py` — activity + solved problems
- `api/Progress.py` — solved count + streak
- `app/services/piston.py` — execution abstraction

## 🔌 Execution
- Piston for standard languages (`PISTON_URL`)
- Algo executor for custom language (`ALGO_EXECUTE_URL`)

## 🧭 Important Endpoints (Backend)
- `GET /problem` (paginated)
- `GET /problem/{id}`
- `GET /problem/daily`
- `POST /submission/run`
- `POST /submission/submit`
- `GET /submission/problem/{problem_id}` (user history)
- `GET /user/activity`
- `GET /user/solutions`
- `GET /progress`

## 🗂️ Documentation
Project docs are kept in `/docs` but **ignored by git**.  
Update and use them locally for AI handoff and architecture notes.

## 🛠️ Status
- Submissions are stored only on submit (run is not persisted).
- Activity + solved list are computed from accepted submissions.
- Judge0 integration is planned next.
