# FlyNG API Collection

Bruno API collection for FlyNG - Warehouse Drone Management System.

## Setup

1. Install [Bruno](https://www.usebruno.com/) (free, open-source API client)
2. Open Bruno and click "Open Collection"
3. Navigate to this `api/` folder and select it

## Environments

- **docker** - For Docker Compose development (`localhost:8000`)
- **local** - For local development (`127.0.0.1:8000`)

Select environment from dropdown in Bruno's top bar.

## Collection Structure

```
api/
├── bruno.json              # Collection config
├── collection.bru          # Collection metadata
├── environments/
│   ├── docker.bru          # Docker environment
│   └── local.bru           # Local environment
└── v1/
    └── users/
        ├── auth/           # Authentication
        │   ├── register.bru
        │   ├── login.bru
        │   ├── login-2fa.bru
        │   ├── logout.bru
        │   └── token-refresh.bru
        ├── profile/        # Profile & Password
        │   ├── get-profile.bru
        │   ├── update-profile.bru
        │   └── change-password.bru
        ├── otp/            # OTP & Password Reset
        │   ├── send-otp.bru
        │   ├── verify-otp.bru
        │   └── reset-password.bru
        ├── 2fa/            # Two-Factor Auth
        │   ├── setup.bru
        │   ├── enable.bru
        │   ├── disable.bru
        │   └── backup-codes.bru
        ├── sessions/       # Session Management
        │   ├── list.bru
        │   ├── terminate.bru
        │   └── terminate-all.bru
        ├── email/          # Email Change
        │   ├── request-change.bru
        │   └── confirm-change.bru
        └── admin/          # Admin Endpoints
            ├── user-list.bru
            ├── user-detail.bru
            ├── unlock-user.bru
            ├── force-password-change.bru
            └── login-attempts.bru
```

## Quick Start

1. **Register a user**: Run `auth/register.bru`
2. **Login**: Run `auth/login.bru` (auto-saves tokens to environment)
3. **Use authenticated endpoints**: Tokens are automatically used

## Auto-Token Handling

Login requests automatically save tokens to environment variables:
- `accessToken` - JWT access token (used for auth)
- `refreshToken` - JWT refresh token (for renewal)

## API Documentation

Each `.bru` file contains inline documentation with:
- Endpoint description
- Request body fields
- Response codes
- Usage notes

## Development Notes

- In development mode, OTPs are logged to Docker console
- View logs: `docker-compose logs -f backend`
