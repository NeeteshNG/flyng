# FlyNG - Warehouse Drone Management System

<p align="center">
  <strong>A multi-tenant SaaS platform for warehouse drone automation — built for the Indian market</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Django-6.0-green?style=flat-square&logo=django" alt="Django">
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?style=flat-square&logo=docker" alt="Docker">
</p>

---

## Overview

FlyNG is a comprehensive, multi-tenant warehouse drone management system that automates inventory operations using autonomous drones. It provides organizations with full control over their warehouse infrastructure, drone fleets, inventory, and order fulfillment workflows.

### Key Capabilities

- **Multi-Tenant Organizations** — Teams with role-based memberships, invitations, and ownership transfer
- **Warehouse Infrastructure** — Warehouses, zones, ground control stations, work areas, locations, and bins
- **Drone Fleet Management** — Drones, batteries, maintenance schedules, and live position tracking
- **Real-Time Telemetry** — WebSocket-powered live drone data with TimescaleDB time-series storage
- **Inventory Management** — Categories, items, stock levels, bin templates, label types, and low-stock alerts
- **Order Fulfillment** — Pick orders with line items, batch processing, customer management, and cart workflow
- **Job Queue** — Drone job assignment, pipeline view, real-time status updates, and next-job dispatch
- **Flight Logs** — ULog/CSV parsing, interactive flight data explorer, and configurable graph templates
- **Analytics Dashboards** — 4-tab analytics (Overview, Orders, Fleet, Inventory) with KPIs and charts
- **Bulk Import/Export** — CSV, JSON, XML, and PDF export for 15 resource types; CSV import for 5 types
- **Notifications** — Real-time WebSocket push notifications with notification center
- **Audit Trail** — Full change history on all models via django-simple-history
- **Internationalization** — English + Hindi UI translations and database-level content translation
- **Security** — 2FA (TOTP), progressive account lockout, password history, session management, encrypted PII

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.13+ | Runtime |
| Django | 6.0 | Web framework |
| Django REST Framework | 3.15 | REST API |
| Daphne | 4.1 | ASGI server |
| Django Channels | 4.2 | WebSocket support |
| PostgreSQL | 16 | Primary database |
| TimescaleDB | — | Time-series telemetry data |
| Redis | 7 | Caching & channel layer |
| Celery | 5.4 | Background task queue |
| SimpleJWT | 5.4 | JWT authentication |
| drf-spectacular | 0.28 | OpenAPI 3 documentation |
| django-simple-history | 3.7 | Audit trail |
| django-safedelete | 1.4 | Soft deletes |
| django-modeltranslation | 0.19 | Database content i18n |
| django-cryptography | — | Encrypted PII fields |
| WeasyPrint | 62 | PDF generation |
| pyulog | 0.9 | ULog flight log parsing |
| django-unfold | 0.45 | Modern admin UI |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 5.4 | Build tool |
| TanStack React Query | 5.x | Server state management |
| Zustand | 5.0 | Client state (auth, cart, telemetry) |
| React Router | 6.30 | Routing |
| shadcn/ui + Radix UI | — | Component library |
| Tailwind CSS | 3.4 | Styling |
| React Hook Form + Zod | 7.x / 4.x | Form handling & validation |
| Recharts | 2.15 | Charts & analytics |
| Lucide React | — | Icons |
| Axios | 1.13 | HTTP client |
| react-use-websocket | 4.13 | WebSocket client |
| date-fns | 4.1 | Date formatting |
| Sonner | 2.0 | Toast notifications |

### DevOps
- **Containerization**: Docker + Docker Compose
- **ASGI Server**: Daphne (HTTP + WebSocket)
- **Database**: PostgreSQL 16 with TimescaleDB extension
- **Caching**: Redis 7

---

## Architecture

### Backend — 12 Django Apps

```
apps/
├── core/            # Base models (AuditedModel, SoftDeleteModel), managers, choices, utilities
├── users/           # Authentication, 2FA, sessions, password history, user preferences
├── organizations/   # Multi-tenancy: Organization, Plan, Membership, Subscription, API keys, Settings
├── warehouses/      # Warehouse, Profile, Contact, Zone, GroundControlStation, WorkArea
├── drones/          # Drone, DroneTelemetryLog, MaintenanceSchedule, fleet tracking
├── batteries/       # Battery lifecycle, charging cycles, health tracking, swap records
├── inventory/       # Location, Bin, BinTemplate, LabelType, Category, Item, ItemStock
├── orders/          # PickOrder, PickOrderLine, PickOrderBatch, Customer
├── jobs/            # DroneJob, DroneJobEvent, job queue pipeline
├── logs/            # DroneFlightLog, FlightGraphTemplate, FlightLogGraph, ULog parsing
├── notifications/   # Notification model, WebSocket push delivery
└── realtime/        # Django Channels consumers, WebSocket routing
```

### Frontend — 35+ Pages

**Auth**: Login, Register, Forgot Password

**Dashboard**:
- Home (stats overview, recent jobs, order activity chart)
- Analytics (4 tabs: Overview, Orders, Fleet, Inventory)

**Drones**: Drone List, Live Tracking, Telemetry Logs, Maintenance, Batteries

**Locations**: Warehouses, Zones, Ground Stations, Work Areas, Locations

**Inventory**: Categories, Items, Stock, Low Stock Alerts

**Orders**: New Order (cart), Order History, Customers

**Jobs**: Job List, Job Queue (pipeline view)

**Bin Setup**: Label Types, Bin Templates, Bins

**Engineering**: Log Files, Flight Explorer, Graph Templates

**Settings**: Team Members, Users, Activity Log, Organization, Notifications, Preferences, Billing, API Keys

### Key Design Patterns

- **Multi-Tenancy**: All resources scoped to Organization via `organization_id` FK
- **Permission System**: 218+ granular permission codes with 4 roles (Owner, Admin, Manager, Member) and wildcard matching
- **Audit Trail**: `AuditedModel` base class with django-simple-history on all models
- **Soft Delete**: `SoftDeleteModel` via django-safedelete for recoverable deletions
- **Real-Time**: Django Channels WebSocket for telemetry, job updates, and notifications
- **Query Optimization**: `select_related`, `prefetch_related`, subquery annotations throughout
- **Indian Locale**: ₹ currency, IST timezone, dd/MM/yyyy date format defaults

---

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

4. **Run migrations**
   ```bash
   docker exec flyng_backend python manage.py migrate
   ```

5. **Create superuser**
   ```bash
   docker exec -it flyng_backend python manage.py createsuperuser
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8002/api/v1/
   - Swagger Docs: http://localhost:8002/swagger/
   - ReDoc: http://localhost:8002/redoc/
   - Django Admin: http://localhost:8002/admin/

### Manual Setup (Without Docker)

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements/development.txt

# Configure database connection in .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
flyng/
├── backend/
│   ├── apps/
│   │   ├── core/            # Base models, managers, choices, utilities
│   │   ├── users/           # Auth, 2FA, sessions, preferences
│   │   ├── organizations/   # Multi-tenancy, plans, memberships, billing
│   │   ├── warehouses/      # Warehouses, zones, GCS, work areas
│   │   ├── drones/          # Drones, telemetry, maintenance, fleet tracking
│   │   ├── batteries/       # Battery lifecycle & health
│   │   ├── inventory/       # Locations, bins, items, stock
│   │   ├── orders/          # Pick orders, lines, batches, customers
│   │   ├── jobs/            # Drone jobs, events, queue
│   │   ├── logs/            # Flight logs, ULog parsing, graph templates
│   │   ├── notifications/   # Push notifications
│   │   └── realtime/        # WebSocket consumers
│   ├── config/
│   │   ├── settings/        # Split settings (base, development, production)
│   │   ├── asgi.py          # ASGI application with channels
│   │   ├── urls.py          # URL configuration
│   │   └── wsgi.py          # WSGI application
│   ├── locale/              # i18n translations (en, hi)
│   └── requirements/        # Split requirements (base, development, production)
├── frontend/
│   ├── src/
│   │   ├── api/             # API client, endpoint modules, interceptors
│   │   ├── components/      # Layout, UI (shadcn), shared components
│   │   ├── hooks/           # Custom hooks (use-format, use-delete-dialog, use-list-page)
│   │   ├── lib/             # Utilities (api-error, storage, utils)
│   │   ├── pages/           # Page components organized by domain
│   │   ├── providers/       # Auth, theme, query providers
│   │   └── stores/          # Zustand stores (auth, cart, telemetry)
│   └── public/              # Static assets
├── docker/
│   ├── backend/             # Backend Dockerfile
│   └── frontend/            # Frontend Dockerfile
├── docker-compose.yml       # Development compose
└── docker-compose.prod.yml  # Production compose
```

---

## Docker Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `db` | postgres:16-alpine | 5435:5432 | PostgreSQL database |
| `redis` | redis:7-alpine | 6381:6379 | Cache & channel layer |
| `backend` | Custom (Daphne) | 8002:8000 | Django ASGI server |
| `frontend` | Custom (Vite) | 3000:3000 | React dev server |
| `celery` | Custom | — | Background task worker |
| `migrate` | Custom | — | One-off migration runner |

---

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Django debug mode | `True` |
| `DJANGO_ENV` | Environment (development/production) | `development` |
| `SECRET_KEY` | Django secret key | Auto-generated |
| `POSTGRES_DB` | Database name | `flyng` |
| `POSTGRES_USER` | Database user | `flyng` |
| `POSTGRES_PASSWORD` | Database password | Required |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `VITE_API_URL` | Frontend API base URL | `http://localhost:8002` |

---

## API Documentation

Interactive API documentation is auto-generated via drf-spectacular (OpenAPI 3):

- **Swagger UI**: http://localhost:8002/swagger/
- **ReDoc**: http://localhost:8002/redoc/

A Bruno API collection is also included in the `api/` directory for manual testing.

---

## Development

### Running Tests
```bash
# Backend
docker exec flyng_backend pytest

# Frontend
cd frontend && npm test
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

### Management Commands
```bash
# Run any Django management command via Docker
docker exec flyng_backend python manage.py <command>

# Examples
docker exec flyng_backend python manage.py makemigrations
docker exec flyng_backend python manage.py migrate
docker exec flyng_backend python manage.py collectstatic
```

---

## Deployment

### Production with Docker

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Production Checklist
1. Set `DEBUG=False` and `DJANGO_ENV=production`
2. Generate a strong `SECRET_KEY`
3. Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
4. Set up SSL/TLS certificates
5. Configure proper database credentials
6. Set up Redis for production
7. Configure static/media file serving (Nginx or S3)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

## Contact

- **Developer**: Neetesh NG
- **GitHub**: [@NeeteshNG](https://github.com/NeeteshNG)

---

<p align="center">Made with love in India</p>
