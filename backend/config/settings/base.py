"""
Django Base Settings for FlyNG
"""
import os
from datetime import timedelta
from pathlib import Path

from django.templatetags.static import static
from django.urls import reverse_lazy

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
DJANGO_APPS = [
    'unfold',  # Must be before django.contrib.admin
    'unfold.contrib.filters',  # Optional: Enhanced filters
    'unfold.contrib.forms',  # Optional: Enhanced form widgets
    'unfold.contrib.import_export',  # Optional: Import/Export support
    'unfold.contrib.simple_history',  # Optional: History tracking
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'modeltranslation',  # Must be before apps that use it
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'phonenumber_field',
    # Model utilities
    'safedelete',
    'simple_history',
]

LOCAL_APPS = [
    'apps.core',
    'apps.users',
    'apps.organizations',
    'apps.warehouses',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',  # For language detection
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',  # For tracking user in history
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'flyng'),
        'USER': os.environ.get('POSTGRES_USER', 'flyng'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'flyng_secret'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# =============================================================================
# INTERNATIONALIZATION - India specific with Hindi support
# =============================================================================
from django.utils.translation import gettext_lazy as _

LANGUAGE_CODE = 'en'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Available languages
LANGUAGES = [
    ('en', _('English')),
    ('hi', _('Hindi')),
]

# Path to locale directory
LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# Language cookie settings
LANGUAGE_COOKIE_NAME = 'flyng_language'
LANGUAGE_COOKIE_AGE = 60 * 60 * 24 * 365  # 1 year

# =============================================================================
# DJANGO-MODELTRANSLATION CONFIGURATION
# =============================================================================
# Languages for model field translations (stored in database)
MODELTRANSLATION_LANGUAGES = ('en', 'hi')
MODELTRANSLATION_DEFAULT_LANGUAGE = 'en'
MODELTRANSLATION_FALLBACK_LANGUAGES = ('en',)
# Prepend default language to translated fields in admin
MODELTRANSLATION_PREPOPULATE_LANGUAGE = 'en'

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
# UNFOLD ADMIN CONFIGURATION
# =============================================================================
UNFOLD = {
    "SITE_TITLE": "FlyNG Admin",
    "SITE_HEADER": "FlyNG",
    "SITE_SUBHEADER": "Warehouse Drone Management System",
    "SITE_SYMBOL": "flight",  # Material Symbols icon
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "ENVIRONMENT": "config.settings.unfold_callbacks.environment_callback",
    "COLORS": {
        "primary": {
            "50": "250 245 255",
            "100": "243 232 255",
            "200": "233 213 255",
            "300": "216 180 254",
            "400": "192 132 252",
            "500": "139 92 246",  # Main brand color - purple
            "600": "124 58 237",
            "700": "109 40 217",
            "800": "91 33 182",
            "900": "76 29 149",
            "950": "46 16 101",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Navigation",
                "separator": True,
                "collapsible": False,
                "items": [
                    {
                        "title": "Dashboard",
                        "icon": "dashboard",
                        "link": reverse_lazy("admin:index"),
                    },
                ],
            },
            {
                "title": "User Management",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Users",
                        "icon": "person",
                        "link": reverse_lazy("admin:users_user_changelist"),
                    },
                    {
                        "title": "Groups",
                        "icon": "group",
                        "link": reverse_lazy("admin:auth_group_changelist"),
                    },
                ],
            },
            {
                "title": "Security",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Login Attempts",
                        "icon": "security",
                        "link": reverse_lazy("admin:users_loginattempt_changelist"),
                    },
                    {
                        "title": "OTPs",
                        "icon": "pin",
                        "link": reverse_lazy("admin:users_otp_changelist"),
                    },
                    {
                        "title": "Two-Factor Auth",
                        "icon": "verified_user",
                        "link": reverse_lazy("admin:users_twofactorauth_changelist"),
                    },
                    {
                        "title": "User Sessions",
                        "icon": "devices",
                        "link": reverse_lazy("admin:users_usersession_changelist"),
                    },
                    {
                        "title": "Password History",
                        "icon": "history",
                        "link": reverse_lazy("admin:users_passwordhistory_changelist"),
                    },
                    {
                        "title": "Email Changes",
                        "icon": "mail",
                        "link": reverse_lazy("admin:users_emailchangerequest_changelist"),
                    },
                ],
            },
            {
                "title": "External Links",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "API Documentation",
                        "icon": "api",
                        "link": "/swagger/",
                    },
                    {
                        "title": "ReDoc",
                        "icon": "description",
                        "link": "/redoc/",
                    },
                    {
                        "title": "Frontend App",
                        "icon": "public",
                        "link": "http://localhost:5173",
                    },
                ],
            },
        ],
    },
    "TABS": [
        {
            "models": ["users.user"],
            "items": [
                {
                    "title": "Profile",
                    "link": reverse_lazy("admin:users_user_changelist"),
                },
            ],
        },
    ],
}

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# Redis Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'FlyNG API',
    'DESCRIPTION': 'Warehouse Drone Management System API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/v1',
}

# Phone Number Field Configuration (India default)
PHONENUMBER_DEFAULT_REGION = 'IN'
PHONENUMBER_DEFAULT_FORMAT = 'E164'

# Email Configuration (for OTP)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Change in production
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@flyng.in')

# =============================================================================
# DJANGO-SAFEDELETE CONFIGURATION
# =============================================================================
# Default policy for soft delete
SAFE_DELETE_INTERPRET_UNDELETED_OBJECTS_AS_CREATED = True

# =============================================================================
# DJANGO-SIMPLE-HISTORY CONFIGURATION
# =============================================================================
# Store history in same database
SIMPLE_HISTORY_REVERT_DISABLED = False
# Use foreign keys for user tracking
SIMPLE_HISTORY_FILEFIELD_TO_CHARFIELD = False

# =============================================================================
# DJANGO-CRYPTOGRAPHY CONFIGURATION
# =============================================================================
# Encryption key from environment (required in production)
# In production, use a proper key management service (AWS KMS, etc.)
CRYPTOGRAPHY_KEY = os.environ.get('CRYPTOGRAPHY_KEY', SECRET_KEY)

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
