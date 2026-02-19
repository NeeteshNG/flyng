# FlyNG Makefile - Common commands for development

.PHONY: help up down logs shell migrate makemigrations createsuperuser test lint clean rebuild

# Default target
help:
	@echo "FlyNG Development Commands"
	@echo "=========================="
	@echo ""
	@echo "Setup & Running:"
	@echo "  make up              - Start all services"
	@echo "  make down            - Stop all services"
	@echo "  make rebuild         - Rebuild and start services"
	@echo "  make logs            - Follow logs from all services"
	@echo ""
	@echo "Database & Migrations:"
	@echo "  make migrate         - Apply migrations"
	@echo "  make makemigrations  - Create new migrations"
	@echo "  make showmigrations  - Show migration status"
	@echo "  make resetdb         - Reset database (WARNING: deletes data)"
	@echo ""
	@echo "Django:"
	@echo "  make shell           - Django shell"
	@echo "  make dbshell         - Database shell"
	@echo "  make createsuperuser - Create admin user"
	@echo "  make collectstatic   - Collect static files"
	@echo ""
	@echo "Development:"
	@echo "  make test            - Run tests"
	@echo "  make lint            - Run linter (ruff)"
	@echo "  make format          - Format code (ruff)"
	@echo ""
	@echo "Workers:"
	@echo "  make celery          - Start Celery worker"
	@echo ""

# ============================================
# SETUP & RUNNING
# ============================================

up:
	docker-compose up -d

down:
	docker-compose down

rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

logs:
	docker-compose logs -f

# ============================================
# DATABASE & MIGRATIONS
# ============================================

migrate:
	docker-compose exec backend python manage.py migrate

makemigrations:
	docker-compose exec backend python manage.py makemigrations

showmigrations:
	docker-compose exec backend python manage.py showmigrations

resetdb:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker-compose down -v
	docker-compose up -d db
	sleep 5
	docker-compose up -d

# ============================================
# DJANGO COMMANDS
# ============================================

shell:
	docker-compose exec backend python manage.py shell

dbshell:
	docker-compose exec backend python manage.py dbshell

createsuperuser:
	docker-compose exec backend python manage.py createsuperuser

collectstatic:
	docker-compose exec backend python manage.py collectstatic --noinput

# ============================================
# DEVELOPMENT
# ============================================

test:
	docker-compose exec backend pytest

lint:
	docker-compose exec backend ruff check apps/

format:
	docker-compose exec backend ruff format apps/
	docker-compose exec backend ruff check --fix apps/

# ============================================
# WORKERS
# ============================================

celery:
	docker-compose --profile workers up -d celery

# ============================================
# PRODUCTION
# ============================================

prod-migrate:
	docker-compose -f docker-compose.prod.yml --profile tools run --rm migrate

prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f
