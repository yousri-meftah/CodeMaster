# CodeMaster

CodeMaster is a full‑stack coding practice platform inspired by LeetCode. Users can browse problems, solve them in an online editor, submit solutions, and track progress. It also supports recruiter‑managed technical interviews for hiring.

## What’s Included
- Problem library with difficulty levels and tags
- Code editor with run/submit flow
- Submissions and progress tracking
- Recruiter interview feature with secure candidate links

## Quick Start (Local)
### Prerequisites
- Node.js 18+
- Docker

### Backend
```bash
cd backend
docker compose -f docker-compose.dev.yml up --build
```

### Frontend
```bash
cd client
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

## Project Structure
- `client/` frontend app
- `backend/` backend services

## Contributing
Issues and PRs are welcome. Keep changes focused and include tests when appropriate.
