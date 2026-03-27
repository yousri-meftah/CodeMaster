#!/bin/sh

set -e

if [ "${RUNNING_IN_DOCKER}" = "1" ]; then
  export POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
  export REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}"
  export POSTGRES_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DB}"
fi

echo 'Running Migrations'
alembic upgrade head

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

if [ "${UVICORN_RELOAD}" = "1" ]; then
  echo 'Running Server (dev)'
  exec uvicorn src.main:app --host "$HOST" --port "$PORT" --reload
fi

WORKERS="${UVICORN_WORKERS:-1}"
echo 'Running Server'
exec uvicorn src.main:app --host "$HOST" --port "$PORT" --workers "$WORKERS"
