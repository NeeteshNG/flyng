# FlyNG - Warehouse Drone Management System

<p align="center">
  <strong>A modern warehouse drone management system built for the Indian market</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Django-6.0-green?style=flat-square&logo=django" alt="Django">
  <img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?style=flat-square&logo=docker" alt="Docker">
</p>

---

## Overview

FlyNG is a comprehensive warehouse drone management system designed to automate inventory operations using autonomous drones. It provides end-to-end management of:

- **Warehouse Infrastructure**: Manage warehouses, zones, and work areas
- **Drone Fleet**: Track drones, batteries, and real-time telemetry
- **Inventory Operations**: Handle items, locations, and stock levels
- **Order Management**: Create and process picking orders with job queues
- **Analytics**: Monitor performance with dashboards and reports

## Tech Stack

### Backend
- **Framework**: Django 6.0 + Django REST Framework 3.15
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7 + Celery 5.4
- **Authentication**: JWT (SimpleJWT)
- **Documentation**: OpenAPI/Swagger (drf-spectacular)
- **Python**: 3.13

### Frontend
- **Framework**: React 19 + TypeScript 5.7
- **Build Tool**: Vite 6
- **UI Library**: Material UI v7
- **State Management**: Redux Toolkit 2.5
- **Forms**: React Hook Form + Zod
- **Charts**: ECharts
- **Node.js**: 22

### DevOps
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions (planned)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/NeeteshNG/flyng.git
   cd flyng
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api/v1/
   - Swagger Docs: http://localhost:8000/swagger/
   - Django Admin: http://localhost:8000/admin/

### Manual Setup (Without Docker)

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements/development.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
flyng/
├── backend/
│   ├── apps/
│   │   ├── core/          # Shared utilities, base models
│   │   ├── users/         # User management & auth
│   │   ├── organizations/ # Company/organization (planned)
│   │   ├── warehouses/    # Warehouse management (planned)
│   │   ├── drones/        # Drone & battery (planned)
│   │   ├── inventory/     # Items & inventory (planned)
│   │   └── orders/        # Orders & jobs (planned)
│   ├── config/
│   │   ├── settings/      # Django settings
│   │   ├── urls.py        # URL configuration
│   │   └── wsgi.py        # WSGI application
│   └── requirements/      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store & slices
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
├── docker/
│   ├── backend/           # Backend Dockerfile
│   └── frontend/          # Frontend Dockerfile
├── docker-compose.yml     # Development compose
├── docker-compose.prod.yml # Production compose
└── README.md
```

## API Documentation

API documentation is available at:
- **Swagger UI**: http://localhost:8000/swagger/
- **ReDoc**: http://localhost:8000/redoc/

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:
| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Django debug mode | `True` |
| `SECRET_KEY` | Django secret key | Auto-generated |
| `POSTGRES_DB` | Database name | `flyng` |
| `POSTGRES_USER` | Database user | `flyng` |
| `POSTGRES_PASSWORD` | Database password | Required |
| `VITE_API_BASE_URL` | Frontend API URL | `http://localhost:8000/api/v1` |

## Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Backend
black .
isort .
flake8

# Frontend
npm run lint
```

## Deployment

### Production with Docker

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d --build
```

### Environment Setup for Production
1. Set `DEBUG=False`
2. Generate a strong `SECRET_KEY`
3. Configure proper `ALLOWED_HOSTS`
4. Set up SSL/TLS certificates
5. Configure proper database credentials

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Contact

- **Developer**: Neetesh NG
- **GitHub**: [@NeeteshNG](https://github.com/NeeteshNG)

---

<p align="center">Made with love in India</p>
