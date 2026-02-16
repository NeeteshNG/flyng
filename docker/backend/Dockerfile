# Backend Dockerfile for FlyNG
# Using uv for fast package management
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \
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

# Install Python dependencies with uv (much faster than pip)
# Using --no-build-isolation to avoid needing the full project structure
RUN uv pip install --system \
    "Django>=6.0.2" \
    "djangorestframework>=3.15.2" \
    "django-unfold>=0.45.0" \
    "djangorestframework-simplejwt>=5.4.0" \
    "PyJWT>=2.10.1" \
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
    "pytz>=2024.2" \
    # Dev dependencies
    "pytest>=8.0.0" \
    "pytest-django>=4.8.0" \
    "pytest-cov>=4.1.0" \
    "factory-boy>=3.3.0" \
    "ruff>=0.4.0" \
    "mypy>=1.10.0" \
    "django-extensions>=3.2.3" \
    "ipython>=8.24.0" \
    "django-debug-toolbar>=4.3.0" \
    "django-stubs>=5.0.0" \
    "djangorestframework-stubs>=3.15.0"

# Copy project
COPY backend/ .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Copy and set entrypoint
COPY docker/backend/entrypoint.sh /entrypoint.sh
USER root
RUN chmod +x /entrypoint.sh
USER appuser

ENTRYPOINT ["/entrypoint.sh"]
