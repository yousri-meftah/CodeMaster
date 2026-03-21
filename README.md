# CodeMaster

Full-stack coding practice platform. This repo focuses on a FastAPI backend with PostgreSQL, Alembic migrations, and JWT auth.

## Backend (production-ready focus)
Location: `backend/Backend/`

### Run (dev)
Use the dev compose:
```bash
cd backend
docker compose -f docker-compose.dev.yml up --build
```

### Run (prod)
Use the prod compose:
```bash
cd backend
docker compose -f docker-compose.prod.yml up -d --build
```

### Tests (API-level)
```bash
cd backend/Backend
python -m pytest
```

## CI
GitHub Actions runs backend tests only:
`.github/workflows/backend-ci.yml`

## Status
- Backend has API-level tests and CI.
- Admin-only enforcement for content creation (problems/tags/articles/roadmaps).
- Saved solutions route standardized at `/saved-solution` with legacy alias.
- Interview feature added for recruiter-managed technical interviews and token-based candidate sessions.

## Interview Feature
- Roles: `user`, `recruiter`, `admin`. Recruiter and admin can manage interviews. Candidates remain email-only and authenticate with one-time interview tokens.
- Candidate status flow: `pending` -> `started` -> `submitted` or `expired`.
- Recruiter endpoints:
  - `POST /interviews/`
  - `PUT /interviews/{id}`
  - `POST /interviews/{id}/candidates`
  - `GET /interviews/{id}/candidates`
  - `GET /interviews/{id}/submissions`
  - `GET /interviews/{id}/logs`
- Candidate endpoints:
  - `GET /interview/session?token=...`
  - `POST /interview/start?token=...`
  - `POST /interview/save`
  - `POST /interview/submit`
  - `POST /interview/log`
- Testing notes:
  - API coverage includes recruiter role enforcement, candidate start/save/submit flow, activity logs, and expiry handling.
  - Candidate code is persisted as interview submissions; scoring still remains a later step.

## Next
- Re-enable piston submission test when service is up.
- Expand edge-case tests for submissions and auth.
- Add more auth and validation edge cases as features grow.
