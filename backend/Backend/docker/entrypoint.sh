set -e

echo 'Running Migrations'
alembic upgrade head

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

if [ "${UVICORN_RELOAD}" = "1" ]; then
  echo 'Running Server (dev)'
  exec uvicorn src.main:app --host "$HOST" --port "$PORT" --reload
fi

WORKERS="${UVICORN_WORKERS:-2}"
echo 'Running Server'
exec uvicorn src.main:app --host "$HOST" --port "$PORT" --workers "$WORKERS"
