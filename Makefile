SHELL := /bin/sh

COMPOSE ?= docker compose
COMPOSE_PROD := $(COMPOSE) -f docker-compose.prod.yml

.PHONY: help prod-up prod-down prod-rebuild prod-logs prod-ps

help:
	@echo "Available targets:"
	@echo "  make prod-up       Build and start full production stack"
	@echo "  make prod-down     Stop and remove full production stack"
	@echo "  make prod-rebuild  Force rebuild + recreate full production stack"
	@echo "  make prod-logs     Tail logs from all services"
	@echo "  make prod-ps       Show stack status"

prod-up:
	$(COMPOSE_PROD) up --build -d

prod-down:
	$(COMPOSE_PROD) down

prod-rebuild:
	$(COMPOSE_PROD) up --build -d --force-recreate

prod-logs:
	$(COMPOSE_PROD) logs -f

prod-ps:
	$(COMPOSE_PROD) ps
