"""
Django Settings Module
Load settings based on DJANGO_SETTINGS_MODULE environment variable
"""

import os

environment = os.environ.get("DJANGO_ENV", "development")

if environment == "production":
    from .production import *
else:
    from .development import *
