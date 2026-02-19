#!/bin/bash
set -e

echo "=== FlyNG Backend Starting ==="

# ============================================
# AUTO-SYNC DEPENDENCIES FROM pyproject.toml
# ============================================
# This ensures new dependencies are installed automatically
# when pyproject.toml is updated (via volume mount)
echo "Syncing dependencies from pyproject.toml..."
if [ -f "pyproject.toml" ]; then
    # Extract and install dependencies from pyproject.toml
    # Using uv for fast installation
    uv pip install --system --quiet \
        $(python -c "
import tomllib
with open('pyproject.toml', 'rb') as f:
    data = tomllib.load(f)
deps = data.get('project', {}).get('dependencies', [])
print(' '.join([f'\"{d}\"' for d in deps]))
" 2>/dev/null) 2>/dev/null || echo "Using pre-installed dependencies"
    echo "Dependencies synced!"
else
    echo "No pyproject.toml found, using pre-installed dependencies"
fi

# ============================================
# WAIT FOR DATABASE
# ============================================
echo "Waiting for PostgreSQL..."
while ! pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER > /dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready!"

# ============================================
# WAIT FOR REDIS
# ============================================
echo "Waiting for Redis..."
until redis-cli -h redis ping > /dev/null 2>&1; do
    sleep 1
done
echo "Redis is ready!"

# ============================================
# DJANGO SETUP
# ============================================
# Make migrations (if any pending)
echo "Checking for new migrations..."
python manage.py makemigrations --noinput 2>/dev/null || true

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || python manage.py collectstatic --noinput

# ============================================
# START SERVER
# ============================================
if [ "$DEBUG" = "True" ]; then
    echo "=== Starting Development Server ==="
    exec python manage.py runserver 0.0.0.0:8000
else
    echo "=== Starting Production Server (Gunicorn) ==="
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers ${GUNICORN_WORKERS:-3} \
        --timeout ${GUNICORN_TIMEOUT:-120} \
        --access-logfile - \
        --error-logfile -
fi
