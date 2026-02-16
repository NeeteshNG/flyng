# Backend Dockerfile for FlyNG
FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    libpq-dev \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/development.txt

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
