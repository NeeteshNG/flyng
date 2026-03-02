"""
Django Development Settings for FlyNG

Uses PostgreSQL and Redis from docker-compose.
Run with: docker compose up --build
"""

from .base import *

DEBUG = True

# Additional apps for development
INSTALLED_APPS += [
    "django_extensions",
    "debug_toolbar",
]

MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")

# Debug toolbar settings
INTERNAL_IPS = ["127.0.0.1", "localhost", "172.17.0.1"]  # Added Docker bridge IP

# Allow all hosts in development
ALLOWED_HOSTS = ["*"]

# Use console email backend
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Simplified logging for development
LOGGING["root"]["level"] = "DEBUG"
LOGGING["loggers"]["apps"]["level"] = "DEBUG"
