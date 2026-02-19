#!/bin/bash
set -e

echo "=== FlyNG Backend Starting ==="

# ============================================
# AUTO-SYNC DEPENDENCIES FROM pyproject.toml
# ============================================
if [ "$SYNC_DEPENDENCIES" = "true" ] && [ -f "pyproject.toml" ]; then
    echo "Syncing dependencies from pyproject.toml..."
    uv pip install --system --quiet \
        $(python -c "
import tomllib
with open('pyproject.toml', 'rb') as f:
    data = tomllib.load(f)
deps = data.get('project', {}).get('dependencies', [])
print(' '.join([f'\"{d}\"' for d in deps]))
" 2>/dev/null) 2>/dev/null || echo "Using pre-installed dependencies"
    echo "Dependencies synced!"
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

# Run migrations ONLY if RUN_MIGRATIONS=true
# In production, migrations should be run as a separate step
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running migrations..."
    python manage.py migrate --noinput
fi

# Collect static files
if [ "$COLLECT_STATIC" = "true" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --noinput --clear 2>/dev/null || python manage.py collectstatic --noinput
fi

# Create superuser in development (if doesn't exist)
if [ "$CREATE_SUPERUSER" = "true" ]; then
    echo "Creating superuser..."
    python manage.py shell -c "
from apps.users.models import User
if not User.objects.filter(email='${SUPERUSER_EMAIL:-admin@flyng.local}').exists():
    User.objects.create_superuser(
        email='${SUPERUSER_EMAIL:-admin@flyng.local}',
        password='${SUPERUSER_PASSWORD:-admin123}',
        first_name='Admin',
        last_name='User'
    )
    print('Superuser created: ${SUPERUSER_EMAIL:-admin@flyng.local}')
else:
    print('Superuser already exists')
"
fi

# ============================================
# START SERVER
# ============================================
echo "=== Starting Server ==="
exec "$@"
