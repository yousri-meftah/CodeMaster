# CodeMaster

CodeMaster is a full-stack coding platform (practice + recruiter interview workflow) with:
- React + Vite frontend
- FastAPI backend
- Postgres
- Nginx reverse proxy (production stack)
- Prometheus + Grafana monitoring

## Project Structure

- `client/` frontend
- `backend/` backend API + migrations + tests
- `deploy/` nginx and monitoring configs
- `docker-compose.prod.yml` full production-like stack

## 1) Clone

```bash
git clone <your-repo-url>
cd CodeMaster
```

## 2) Local Development (Backend + Frontend)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create env files from examples:

```bash
copy envs\example.env envs\backend.env
copy envs\pg_example.env envs\pg.env
```

Run API:

```bash
uvicorn src.main:app --reload
```

### Frontend (new terminal)

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8000`

## 3) One-Command Stack (Docker)

From project root:

### Linux/macOS
```bash
make prod-up
```

### Windows (CMD/PowerShell, no make required)
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

This starts nginx + client build, backend, postgres, prometheus, and grafana.  
Backend migrations run automatically on container startup.

## Useful Endpoints

- App: `http://localhost`
- Backend health: `http://localhost/healthz`
- Backend metrics: `http://localhost/metrics`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (default `admin/admin`)
