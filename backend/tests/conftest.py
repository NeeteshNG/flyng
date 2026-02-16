"""
Pytest configuration and fixtures for FlyNG backend tests.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user_factory(db):
    """Factory for creating test users."""

    def create_user(
        email="test@example.com",
        password="testpass123",
        role="OPERATOR",
        is_verified=True,
        **kwargs,
    ):
        return User.objects.create_user(
            email=email,
            password=password,
            role=role,
            is_verified=is_verified,
            **kwargs,
        )

    return create_user


@pytest.fixture
def admin_user(user_factory):
    """Create an admin user."""
    return user_factory(
        email="admin@flyng.in",
        role="ADMIN",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def operator_user(user_factory):
    """Create an operator user."""
    return user_factory(
        email="operator@flyng.in",
        role="OPERATOR",
    )


@pytest.fixture
def authenticated_client(api_client, operator_user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=operator_user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an admin-authenticated API client."""
    api_client.force_authenticate(user=admin_user)
    return api_client
