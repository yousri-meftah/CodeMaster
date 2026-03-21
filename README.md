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

## Next
- Re-enable piston submission test when service is up.
- Expand edge-case tests for submissions and auth.
- Add more auth and validation edge cases as features grow.
