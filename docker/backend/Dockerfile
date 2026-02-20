# Backend Dockerfile for FlyNG
# Using uv for fast package management with auto-sync on startup
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1
ENV UV_COMPILE_BYTECODE=1

# Set work directory
WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    gcc \
    python3-dev \
    libpq-dev \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy dependency files first (for better layer caching)
COPY backend/pyproject.toml .

# Install base dependencies (cached layer)
# These are installed during build for faster container startup
RUN uv pip install --system \
    "Django>=6.0.2" \
    "djangorestframework>=3.15.2" \
    "django-unfold>=0.45.0" \
    "djangorestframework-simplejwt>=5.4.0" \
    "PyJWT>=2.10.1" \
    "pyotp>=2.9.0" \
    "qrcode[pil]>=7.4.2" \
    "psycopg2-binary>=2.9.10" \
    "django-cors-headers>=4.6.0" \
    "django-filter>=24.3" \
    "django-redis>=5.4.0" \
    "redis>=5.2.1" \
    "celery>=5.4.0" \
    "drf-spectacular>=0.28.0" \
    "python-dotenv>=1.0.1" \
    "Pillow>=11.1.0" \
    "python-dateutil>=2.9.0" \
    "django-phonenumber-field[phonenumberslite]>=8.0.0" \
    "pytz>=2024.2" \
    "django-model-utils>=5.0.0" \
    "django-safedelete>=1.4.0" \
    "django-simple-history>=3.7.0" \
    "django-cryptography-django5>=1.2" \
    "django-timescaledb>=0.2.13" \
    "django-modeltranslation>=0.19.0" \
    "gunicorn>=22.0.0" \
    "django-extensions>=3.2.3" \
    "django-debug-toolbar>=4.3.0"

# Copy entrypoint script first (before switching user)
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy project
COPY backend/ .

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Expose port
EXPOSE 8000

# Entrypoint handles dependency sync and startup
ENTRYPOINT ["/entrypoint.sh"]
