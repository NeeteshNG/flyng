#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
    sleep 1
done
echo "PostgreSQL is ready!"

echo "Waiting for Redis..."
until redis-cli -h redis ping > /dev/null 2>&1; do
    sleep 1
done
echo "Redis is ready!"

# Make migrations (if any pending)
echo "Making migrations..."
python manage.py makemigrations --noinput || true

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
if [ "$DEBUG" = "True" ]; then
    echo "Starting development server..."
    exec python manage.py runserver 0.0.0.0:8000
else
    echo "Starting production server with Gunicorn..."
    exec gunicorn config.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers 3 \
        --timeout 120 \
        --access-logfile - \
        --error-logfile -
fi
