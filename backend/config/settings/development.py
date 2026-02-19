"""
Django Development Settings for FlyNG

Supports both:
- Docker: Uses PostgreSQL and Redis from docker-compose
- Local: Uses SQLite and local memory cache (when POSTGRES_HOST not set)
"""
import os

from .base import *

DEBUG = True

# Check if running in Docker (POSTGRES_HOST is set by docker-compose)
IN_DOCKER = os.environ.get('POSTGRES_HOST') is not None

if IN_DOCKER:
    # Docker environment - use PostgreSQL and Redis from docker-compose
    # Database settings are already configured in base.py via environment variables
    pass
else:
    # Local development without Docker - use SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    # Disable Redis cache for local development
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

# Additional apps for development
INSTALLED_APPS += [
    'django_extensions',
    'debug_toolbar',
]

MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')

# Debug toolbar settings
INTERNAL_IPS = ['127.0.0.1', 'localhost', '172.17.0.1']  # Added Docker bridge IP

# Allow all hosts in development
ALLOWED_HOSTS = ['*']

# Use console email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Simplified logging for development
LOGGING['root']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'
