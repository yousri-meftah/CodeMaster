SHELL := /bin/sh

COMPOSE ?= docker compose
COMPOSE_DEV := $(COMPOSE) -f docker-compose.dev.yml
COMPOSE_PROD := $(COMPOSE) -f docker-compose.prod.yml
PYTHON ?= python
UVICORN ?= uvicorn
APP ?= src.main:app
HOST ?= 127.0.0.1
PORT ?= 8000
MSG ?= new_migration

.PHONY: help install run test migrate makemigrations \
	up down rebuild logs ps shell dbshell redis-cli \
	prod-up prod-down prod-logs

help:
	@echo "Available targets:"
	@echo "  make install         Install Python dependencies"
	@echo "  make run             Run the backend locally with reload"
	@echo "  make test            Run backend tests"
	@echo "  make migrate         Apply Alembic migrations"
	@echo "  make makemigrations  Create a new Alembic revision (use MSG=name)"
	@echo "  make up              Start local Docker services"
	@echo "  make down            Stop local Docker services"
	@echo "  make rebuild         Rebuild and start local Docker services"
	@echo "  make logs            Tail backend Docker logs"
	@echo "  make ps              Show Docker service status"
	@echo "  make shell           Open a shell in the backend container"
	@echo "  make dbshell         Open psql in the postgres container"
	@echo "  make redis-cli       Open redis-cli in the redis container"
	@echo "  make prod-up         Start production Docker services"
	@echo "  make prod-down       Stop production Docker services"
	@echo "  make prod-logs       Tail production backend logs"

install:
	$(PYTHON) -m pip install -r requirements.txt

run:
	$(UVICORN) $(APP) --reload --host $(HOST) --port $(PORT)

test:
	pytest -q

migrate:
	alembic upgrade head

makemigrations:
	alembic revision --autogenerate -m "$(MSG)"

up:
	$(COMPOSE_DEV) up --build -d

down:
	$(COMPOSE_DEV) down

rebuild:
	$(COMPOSE_DEV) up --build -d --force-recreate

logs:
	$(COMPOSE_DEV) logs -f backend

ps:
	$(COMPOSE_DEV) ps

shell:
	$(COMPOSE_DEV) exec backend sh

dbshell:
	$(COMPOSE_DEV) exec postgres sh -lc 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

redis-cli:
	$(COMPOSE_DEV) exec redis redis-cli

prod-up:
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f backend
