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

# Install dependencies from pyproject.toml (single source of truth)
# Generate a requirements.txt from pyproject.toml and install
RUN python -c "import tomllib; f=open('pyproject.toml','rb'); d=tomllib.load(f); print('\n'.join(d['project']['dependencies']))" > /tmp/requirements.txt \
    && uv pip install --system -r /tmp/requirements.txt \
    && rm /tmp/requirements.txt

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
